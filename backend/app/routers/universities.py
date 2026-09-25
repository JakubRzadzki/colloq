"""Universities, faculties, fields, subjects CRUD and image handling. File cleanup on delete."""
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import joinedload
from sqlalchemy import desc, func

from app.core.deps import CurrentUser, DbSession, OptionalUser
from app.models import University, Faculty, FieldOfStudy, Subject, Review
from app.schemas import (
    UniversityOut,
    FacultyOut,
    FieldOfStudyOut,
    SubjectOut,
    SubjectCreate,
    FieldOfStudyCreate,
    ReviewOut,
)
from app.services.file_manager import (
    save_upload,
    normalize_stored_path,
    DIR_UNIVERSITIES,
    DIR_FACULTIES,
)

router = APIRouter(tags=["universities"])

DEFAULT_UNIVERSITY_IMAGE = "https://placehold.co/400x200/5e5ce6/ffffff?text=Colloq"


def _uni_out(uni: University) -> UniversityOut:
    """Serialize university and normalize image paths for preview."""
    out = UniversityOut.model_validate(uni)
    if out.image_url and out.image_url.startswith("/uploads"):
        out.image_url = normalize_stored_path(out.image_url)
    if out.banner_url and out.banner_url.startswith("/uploads"):
        out.banner_url = normalize_stored_path(out.banner_url)
    return out


@router.post("/universities", response_model=UniversityOut)
def create_university(
    current_user: CurrentUser,
    db: DbSession,
    name: str = Form(...),
    city: str = Form(...),
    region: str = Form(""),
    country: str = Form("Poland"),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
):
    """Create a new university entry."""
    image_url = DEFAULT_UNIVERSITY_IMAGE
    if image and image.filename:
        image_url = save_upload(image, DIR_UNIVERSITIES)
    university = University(
        name=name.strip(),
        city=city.strip(),
        region=(region or "").strip(),
        country=(country or "Poland").strip(),
        description=description.strip() if (description and isinstance(description, str)) else None,
        image_url=image_url,
        is_approved=current_user.is_admin,  # Regular users' submissions require admin approval
    )
    db.add(university)
    db.commit()
    db.refresh(university)
    return _uni_out(university)


@router.get("/universities", response_model=List[UniversityOut])
def get_universities(
    db: DbSession,
    region: Optional[str] = None,
):
    """List all approved universities. Optional region filter."""
    q = db.query(University).filter(University.is_approved == True)
    if region and region.strip():
        q = q.filter(func.lower(University.region) == region.strip().lower())
    rows = q.order_by(University.name).all()
    return [_uni_out(u) for u in rows]


@router.get("/universities/{uni_id}", response_model=UniversityOut)
def get_university(
    uni_id: int,
    current_user: OptionalUser,
    db: DbSession,
):
    """Get a single university by ID. Unapproved universities are visible to admins only."""
    uni = db.query(University).filter(University.id == uni_id).first()
    if not uni or not (uni.is_approved or (current_user and current_user.is_admin)):
        raise HTTPException(status_code=404, detail="University not found")
    return _uni_out(uni)


@router.get("/universities/{uni_id}/faculties", response_model=List[FacultyOut])
def get_faculties(uni_id: int, db: DbSession):
    """List approved faculties for a university."""
    faculties = db.query(Faculty).filter(Faculty.university_id == uni_id, Faculty.is_approved == True).all()  # noqa: E712
    result = []
    for f in faculties:
        out = FacultyOut.model_validate(f)
        if out.image_url:
            out.image_url = normalize_stored_path(out.image_url)
        result.append(out)
    return result


@router.post("/faculties", response_model=FacultyOut)
def create_faculty(
    current_user: CurrentUser,
    db: DbSession,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    university_id: int = Form(...),
):
    """Create a faculty."""
    if not db.query(University).filter(University.id == university_id).first():
        raise HTTPException(status_code=404, detail="University not found")
    image_url = None
    if image and image.filename:
        image_url = save_upload(image, DIR_FACULTIES)
    faculty = Faculty(
        name=name,
        description=description,
        image_url=image_url,
        university_id=university_id,
        is_approved=current_user.is_admin,  # Regular users' submissions require admin approval
    )
    db.add(faculty)
    db.commit()
    db.refresh(faculty)
    out = FacultyOut.model_validate(faculty)
    if out.image_url:
        out.image_url = normalize_stored_path(out.image_url)
    return out


@router.get("/faculties/{fac_id}/fields", response_model=List[FieldOfStudyOut])
def get_fields(fac_id: int, db: DbSession):
    """List approved fields of study for a faculty."""
    return db.query(FieldOfStudy).filter(FieldOfStudy.faculty_id == fac_id, FieldOfStudy.is_approved == True).all()  # noqa: E712


@router.post("/fields", response_model=FieldOfStudyOut)
def create_field(
    data: FieldOfStudyCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a field of study."""
    if not db.query(Faculty).filter(Faculty.id == data.faculty_id).first():
        raise HTTPException(status_code=404, detail="Faculty not found")
    field = FieldOfStudy(
        name=data.name,
        degree_level=data.degree_level,
        faculty_id=data.faculty_id,
        is_approved=current_user.is_admin,  # Regular users' submissions require admin approval
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.get("/fields/{field_id}/subjects", response_model=List[SubjectOut])
def get_subjects(
    field_id: int,
    db: DbSession,
    semester: Optional[int] = None,
):
    """List approved subjects for a field. Supports optional semester filtering."""
    q = db.query(Subject).filter(Subject.field_of_study_id == field_id, Subject.is_approved == True)  # noqa: E712
    if semester is not None:
        q = q.filter(Subject.semester == semester)
    return q.all()


@router.post("/subjects", response_model=SubjectOut)
def create_subject(
    data: SubjectCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a subject."""
    if not db.query(FieldOfStudy).filter(FieldOfStudy.id == data.field_of_study_id).first():
        raise HTTPException(status_code=404, detail="Field of study not found")
    subject = Subject(
        name=data.name,
        semester=data.semester,
        academic_year=data.academic_year,
        field_of_study_id=data.field_of_study_id,
        is_approved=current_user.is_admin,  # Regular users' submissions require admin approval
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.get("/universities/{uni_id}/reviews", response_model=List[ReviewOut])
def get_university_reviews(uni_id: int, db: DbSession):
    """List reviews for a university."""
    return db.query(Review).options(
        joinedload(Review.user),
    ).filter(Review.university_id == uni_id).order_by(desc(Review.created_at)).all()


@router.post("/universities/{uni_id}/image_request")
def request_image_change(
    uni_id: int,
    current_user: CurrentUser,
    db: DbSession,
    image: UploadFile = File(...),
):
    """Submit an image change request for a university."""
    from app.models import ImageRequest
    url = save_upload(image, DIR_UNIVERSITIES)
    req = ImageRequest(
        university_id=uni_id,
        new_image_url=url,
        submitted_by_id=current_user.id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"msg": "Image request submitted", "id": req.id}
