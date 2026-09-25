"""Global search across notes, universities, fields of study and subjects."""
from fastapi import APIRouter
from sqlalchemy.orm import joinedload

from app.core.deps import DbSession
from app.models import Faculty, FieldOfStudy, Note, Subject, University

router = APIRouter(tags=["search"])


@router.get("/search/global")
def global_search(db: DbSession, q: str = ""):
    """Search across notes, universities, fields of study, and subjects."""
    if not q.strip():
        return {"notes": [], "universities": [], "fields": [], "subjects": []}
    # Strip wildcard characters to prevent SQL injection pattern exploitation
    search_term = q.strip()[:100].replace("%", "").replace("_", "")
    pattern = f"%{search_term}%"

    # Search notes
    notes_q = db.query(Note).options(
        joinedload(Note.author), joinedload(Note.subject),
    ).filter(
        Note.is_approved == True,
        Note.title.ilike(pattern),
    ).limit(20).all()

    # Search universities
    unis = db.query(University).filter(
        University.is_approved == True,
        University.name.ilike(pattern),
    ).limit(20).all()

    # Search fields
    fields = db.query(FieldOfStudy).options(joinedload(FieldOfStudy.faculty).joinedload(Faculty.university)).filter(
        FieldOfStudy.is_approved == True,
        FieldOfStudy.name.ilike(pattern),
    ).limit(20).all()

    # Search subjects
    subjects = db.query(Subject).options(joinedload(Subject.field_of_study).joinedload(FieldOfStudy.faculty).joinedload(Faculty.university)).filter(
        Subject.is_approved == True,
        Subject.name.ilike(pattern),
    ).limit(20).all()

    return {
        "notes": [{"id": n.id, "title": n.title, "score": n.score, "university_id": n.university_id, "user_nickname": n.author.nickname if n.author else None} for n in notes_q],
        "universities": [{"id": u.id, "name": u.name, "city": u.city, "region": u.region, "image_url": u.image_url} for u in unis],
        "fields": [{"id": f.id, "name": f.name, "degree_level": f.degree_level, "faculty_id": f.faculty_id, "faculty_name": f.faculty.name if f.faculty else None, "university_id": f.faculty.university_id if f.faculty else None, "university_name": f.faculty.university.name if f.faculty and f.faculty.university else None} for f in fields],
        "subjects": [{"id": s.id, "name": s.name, "semester": s.semester, "field_of_study_id": s.field_of_study_id, "field_name": s.field_of_study.name if s.field_of_study else None, "faculty_name": s.field_of_study.faculty.name if s.field_of_study and s.field_of_study.faculty else None, "university_id": s.field_of_study.faculty.university_id if s.field_of_study and s.field_of_study.faculty else None, "university_name": s.field_of_study.faculty.university.name if s.field_of_study and s.field_of_study.faculty and s.field_of_study.faculty.university else None} for s in subjects],
    }
