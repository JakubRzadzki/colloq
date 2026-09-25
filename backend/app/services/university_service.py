"""Universities and their hierarchy: faculties, fields of study and subjects."""
from __future__ import annotations

from typing import TypeGuard

from sqlalchemy import desc, func
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import DomainError, NotFoundError
from app.models import Faculty, FieldOfStudy, ImageRequest, Review, Subject, University, User
from app.schemas import FieldOfStudyCreate, SubjectCreate
from app.services.file_manager import DIR_FACULTIES, DIR_UNIVERSITIES
from app.services.storage import LocalFileStorage, Upload, commit_or_discard, delete_files

DEFAULT_UNIVERSITY_IMAGE = "https://placehold.co/400x200/5e5ce6/ffffff?text=Colloq"


def _visible(item, user: User | None) -> bool:
    """Unapproved hierarchy items exist only for admins."""
    return item is not None and bool(item.is_approved or (user is not None and user.is_admin))


def _required(value: str, label: str) -> str:
    value = value.strip()
    if not value:
        raise DomainError(f"{label} must not be empty")
    return value


def _has_file(upload: Upload | None) -> TypeGuard[Upload]:
    return upload is not None and bool(upload.filename)


class UniversityService:
    def __init__(self, db: Session, storage: LocalFileStorage):
        self.db = db
        self.storage = storage

    # --- lookups -----------------------------------------------------------

    def _get_visible(self, model: type, item_id: int, user: User | None, not_found: str):
        item = self.db.get(model, item_id)
        if not _visible(item, user):
            raise NotFoundError(not_found)
        return item

    def get_university(self, uni_id: int, user: User | None) -> University:
        return self._get_visible(University, uni_id, user, "University not found")

    def _get_university_for_admin(self, uni_id: int) -> University:
        uni = self.db.get(University, uni_id)
        if uni is None:
            raise NotFoundError("University not found")
        return uni

    # --- listings ------------------------------------------------------------

    def list_universities(self, region: str | None) -> list[University]:
        query = self.db.query(University).filter(University.is_approved.is_(True))
        if region and region.strip():
            query = query.filter(func.lower(University.region) == region.strip().lower())
        return query.order_by(University.name).all()

    def list_faculties(self, uni_id: int) -> list[Faculty]:
        return self.db.query(Faculty).filter(Faculty.university_id == uni_id, Faculty.is_approved.is_(True)).all()

    def list_fields(self, faculty_id: int) -> list[FieldOfStudy]:
        return (
            self.db.query(FieldOfStudy)
            .filter(FieldOfStudy.faculty_id == faculty_id, FieldOfStudy.is_approved.is_(True))
            .all()
        )

    def list_subjects(self, field_id: int, semester: int | None) -> list[Subject]:
        query = self.db.query(Subject).filter(Subject.field_of_study_id == field_id, Subject.is_approved.is_(True))
        if semester is not None:
            query = query.filter(Subject.semester == semester)
        return query.all()

    def list_reviews(self, uni_id: int) -> list[Review]:
        return (
            self.db.query(Review)
            .options(joinedload(Review.user))
            .filter(Review.university_id == uni_id)
            .order_by(desc(Review.created_at))
            .all()
        )

    # --- creation (regular users' submissions wait for approval) ---------------

    def create_university(
        self,
        user: User,
        *,
        name: str,
        city: str,
        region: str | None,
        country: str | None,
        description: str | None,
        image: Upload | None,
    ) -> University:
        saved: list[str] = []
        image_url = DEFAULT_UNIVERSITY_IMAGE
        if _has_file(image):
            image_url = self.storage.save_image(image, DIR_UNIVERSITIES)
            saved.append(image_url)
        university = University(
            name=name.strip(),
            city=city.strip(),
            region=(region or "").strip(),
            country=(country or "Poland").strip(),
            description=description.strip() if description else None,
            image_url=image_url,
            is_approved=user.is_admin,
        )
        self.db.add(university)
        commit_or_discard(self.db, self.storage, saved)
        return university

    def create_faculty(
        self, user: User, *, name: str, description: str | None, university_id: int, image: Upload | None
    ) -> Faculty:
        self._get_visible(University, university_id, user, "University not found")
        saved: list[str] = []
        image_url = None
        if _has_file(image):
            image_url = self.storage.save_image(image, DIR_FACULTIES)
            saved.append(image_url)
        faculty = Faculty(
            name=name,
            description=description,
            image_url=image_url,
            university_id=university_id,
            is_approved=user.is_admin,
        )
        self.db.add(faculty)
        commit_or_discard(self.db, self.storage, saved)
        return faculty

    def create_field(self, user: User, data: FieldOfStudyCreate) -> FieldOfStudy:
        self._get_visible(Faculty, data.faculty_id, user, "Faculty not found")
        field = FieldOfStudy(
            name=data.name,
            degree_level=data.degree_level,
            faculty_id=data.faculty_id,
            is_approved=user.is_admin,
        )
        self.db.add(field)
        self.db.commit()
        return field

    def create_subject(self, user: User, data: SubjectCreate) -> Subject:
        self._get_visible(FieldOfStudy, data.field_of_study_id, user, "Field of study not found")
        subject = Subject(
            name=data.name,
            semester=data.semester,
            academic_year=data.academic_year,
            field_of_study_id=data.field_of_study_id,
            is_approved=user.is_admin,
        )
        self.db.add(subject)
        self.db.commit()
        return subject

    def request_image_change(self, user: User, uni_id: int, image: Upload) -> ImageRequest:
        # Check the university before writing anything to disk.
        self.get_university(uni_id, user)
        url = self.storage.save_image(image, DIR_UNIVERSITIES)
        request = ImageRequest(university_id=uni_id, new_image_url=url, submitted_by_id=user.id)
        self.db.add(request)
        commit_or_discard(self.db, self.storage, [url])
        return request

    # --- admin updates -----------------------------------------------------------

    def admin_update_university(
        self,
        uni_id: int,
        *,
        name: str | None = None,
        city: str | None = None,
        region: str | None = None,
        country: str | None = None,
        description: str | None = None,
        image: Upload | None = None,
        banner: Upload | None = None,
    ) -> University:
        uni = self._get_university_for_admin(uni_id)
        if name is not None:
            uni.name = _required(name, "Name")
        if city is not None:
            uni.city = _required(city, "City")
        if region is not None:
            uni.region = region.strip()
        if country is not None:
            uni.country = country.strip()
        if description is not None:
            uni.description = description.strip() or None

        saved: list[str] = []
        replaced: list[str | None] = []
        try:
            if _has_file(image):
                new_url = self.storage.save_image(image, DIR_UNIVERSITIES)
                saved.append(new_url)
                replaced.append(uni.image_url)
                uni.image_url = new_url
            if _has_file(banner):
                new_url = self.storage.save_image(banner, DIR_UNIVERSITIES)
                saved.append(new_url)
                replaced.append(uni.banner_url)
                uni.banner_url = new_url
        except Exception:
            self.db.rollback()
            delete_files(self.storage, saved)
            raise
        commit_or_discard(self.db, self.storage, saved)
        # Old files are removed only once the new paths are committed.
        delete_files(self.storage, replaced)
        return uni

    def admin_update_university_image(self, uni_id: int, image: Upload) -> University:
        return self.admin_update_university(uni_id, image=image)
