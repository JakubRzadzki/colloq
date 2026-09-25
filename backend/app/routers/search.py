"""Global search across notes, universities, fields of study and subjects."""
from fastapi import APIRouter
from sqlalchemy.orm import joinedload

from app.core.deps import DbSession
from app.core.sql import LIKE_ESCAPE, escape_like
from app.models import Faculty, FieldOfStudy, Note, Subject, University
from app.repositories.note_repository import NoteRepository

router = APIRouter(tags=["search"])

RESULT_LIMIT = 20


def _note(n: Note) -> dict:
    return {
        "id": n.id,
        "title": n.title,
        "score": n.score,
        "university_id": n.university_id,
        "user_nickname": n.author.nickname if n.author else None,
    }


def _university(u: University) -> dict:
    return {"id": u.id, "name": u.name, "city": u.city, "region": u.region, "image_url": u.image_url}


def _field(f: FieldOfStudy) -> dict:
    faculty = f.faculty
    return {
        "id": f.id,
        "name": f.name,
        "degree_level": f.degree_level,
        "faculty_id": f.faculty_id,
        "faculty_name": faculty.name if faculty else None,
        "university_id": faculty.university_id if faculty else None,
        "university_name": faculty.university.name if faculty and faculty.university else None,
    }


def _subject(s: Subject) -> dict:
    field = s.field_of_study
    faculty = field.faculty if field else None
    return {
        "id": s.id,
        "name": s.name,
        "semester": s.semester,
        "field_of_study_id": s.field_of_study_id,
        "field_name": field.name if field else None,
        "faculty_name": faculty.name if faculty else None,
        "university_id": faculty.university_id if faculty else None,
        "university_name": faculty.university.name if faculty and faculty.university else None,
    }


@router.get("/search/global")
def global_search(db: DbSession, q: str = ""):
    """Search approved notes, universities, fields of study, and subjects by name."""
    if not q.strip():
        return {"notes": [], "universities": [], "fields": [], "subjects": []}
    term = q.strip()[:100]
    pattern = f"%{escape_like(term)}%"

    notes = NoteRepository(db).search_public(term, limit=RESULT_LIMIT)
    universities = (
        db.query(University)
        .filter(University.is_approved.is_(True), University.name.ilike(pattern, escape=LIKE_ESCAPE))
        .limit(RESULT_LIMIT)
        .all()
    )
    fields = (
        db.query(FieldOfStudy)
        .options(joinedload(FieldOfStudy.faculty).joinedload(Faculty.university))
        .filter(FieldOfStudy.is_approved.is_(True), FieldOfStudy.name.ilike(pattern, escape=LIKE_ESCAPE))
        .limit(RESULT_LIMIT)
        .all()
    )
    subjects = (
        db.query(Subject)
        .options(joinedload(Subject.field_of_study).joinedload(FieldOfStudy.faculty).joinedload(Faculty.university))
        .filter(Subject.is_approved.is_(True), Subject.name.ilike(pattern, escape=LIKE_ESCAPE))
        .limit(RESULT_LIMIT)
        .all()
    )

    return {
        "notes": [_note(n) for n in notes],
        "universities": [_university(u) for u in universities],
        "fields": [_field(f) for f in fields],
        "subjects": [_subject(s) for s in subjects],
    }
