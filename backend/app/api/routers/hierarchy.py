"""
REST endpoints for University → Faculty → Major → Subject hierarchy.
"""
from typing import List

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import AsyncSessionDep
from app.domain.models import Faculty, Major, Subject, University
from app.schemas.domain import (
    FacultyCreate,
    FacultyOut,
    MajorCreate,
    MajorOut,
    SubjectCreate,
    SubjectOut,
    UniversityCreate,
    UniversityOut,
)

router = APIRouter(tags=["hierarchy"])


# ---------- Universities ----------


@router.get("/universities", response_model=List[UniversityOut])
async def list_universities(
    db: AsyncSession = AsyncSessionDep,
):
    """List all active universities."""
    result = await db.execute(
        select(University).where(University.is_active).order_by(University.name)
    )
    return result.scalars().all()


@router.get("/universities/{university_id}", response_model=UniversityOut)
async def get_university(
    university_id: int,
    db: AsyncSession = AsyncSessionDep,
):
    """Get a university by ID."""
    result = await db.execute(select(University).where(University.id == university_id))
    uni = result.scalar_one_or_none()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    return uni


@router.post("/universities", response_model=UniversityOut)
async def create_university(
    payload: UniversityCreate,
    db: AsyncSession = AsyncSessionDep,
):
    """Create a university."""
    uni = University(
        name=payload.name,
        slug=payload.slug,
        region=payload.region,
        is_active=payload.is_active,
    )
    db.add(uni)
    await db.commit()
    await db.refresh(uni)
    return uni


# ---------- Faculties ----------


@router.get("/universities/{university_id}/faculties", response_model=List[FacultyOut])
async def list_faculties(
    university_id: int,
    db: AsyncSession = AsyncSessionDep,
):
    """List faculties for a university."""
    result = await db.execute(
        select(Faculty).where(Faculty.university_id == university_id).order_by(Faculty.name)
    )
    return result.scalars().all()


@router.post("/faculties", response_model=FacultyOut)
async def create_faculty(
    payload: FacultyCreate,
    db: AsyncSession = AsyncSessionDep,
):
    """Create a faculty."""
    faculty = Faculty(name=payload.name, university_id=payload.university_id)
    db.add(faculty)
    await db.commit()
    await db.refresh(faculty)
    return faculty


# ---------- Majors ----------


@router.get("/faculties/{faculty_id}/majors", response_model=List[MajorOut])
async def list_majors(
    faculty_id: int,
    db: AsyncSession = AsyncSessionDep,
):
    """List majors for a faculty."""
    result = await db.execute(
        select(Major).where(Major.faculty_id == faculty_id).order_by(Major.name)
    )
    return result.scalars().all()


@router.post("/majors", response_model=MajorOut)
async def create_major(
    payload: MajorCreate,
    db: AsyncSession = AsyncSessionDep,
):
    """Create a major."""
    major = Major(name=payload.name, faculty_id=payload.faculty_id)
    db.add(major)
    await db.commit()
    await db.refresh(major)
    return major


# ---------- Subjects ----------


@router.get("/majors/{major_id}/subjects", response_model=List[SubjectOut])
async def list_subjects(
    major_id: int,
    db: AsyncSession = AsyncSessionDep,
):
    """List subjects for a major."""
    result = await db.execute(
        select(Subject).where(Subject.major_id == major_id).order_by(Subject.semester, Subject.name)
    )
    return result.scalars().all()


@router.post("/subjects", response_model=SubjectOut)
async def create_subject(
    payload: SubjectCreate,
    db: AsyncSession = AsyncSessionDep,
):
    """Create a subject (semester 1–10)."""
    subject = Subject(
        name=payload.name,
        major_id=payload.major_id,
        semester=payload.semester,
    )
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject
