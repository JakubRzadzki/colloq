"""Universities, faculties, fields of study and subjects."""
from typing import List, Optional

from fastapi import APIRouter, File, Form, UploadFile

from app.core.deps import CurrentUser, OptionalUser, UniversityServiceDep
from app.schemas import (
    FacultyOut,
    FieldOfStudyCreate,
    FieldOfStudyOut,
    ReviewOut,
    SubjectCreate,
    SubjectOut,
    UniversityOut,
)

router = APIRouter(tags=["universities"])


@router.post("/universities", response_model=UniversityOut)
def create_university(
    current_user: CurrentUser,
    service: UniversityServiceDep,
    name: str = Form(...),
    city: str = Form(...),
    region: str = Form(""),
    country: str = Form("Poland"),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
):
    """Create a university. Regular users' submissions wait for admin approval."""
    return service.create_university(
        current_user, name=name, city=city, region=region, country=country, description=description, image=image,
    )


@router.get("/universities", response_model=List[UniversityOut])
def get_universities(service: UniversityServiceDep, region: Optional[str] = None):
    """List all approved universities. Optional region filter."""
    return service.list_universities(region)


@router.get("/universities/{uni_id}", response_model=UniversityOut)
def get_university(uni_id: int, current_user: OptionalUser, service: UniversityServiceDep):
    """Get a single university by ID. Unapproved universities are visible to admins only."""
    return service.get_university(uni_id, current_user)


@router.get("/universities/{uni_id}/faculties", response_model=List[FacultyOut])
def get_faculties(uni_id: int, service: UniversityServiceDep):
    """List approved faculties for a university."""
    return service.list_faculties(uni_id)


@router.post("/faculties", response_model=FacultyOut)
def create_faculty(
    current_user: CurrentUser,
    service: UniversityServiceDep,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    university_id: int = Form(...),
):
    """Create a faculty. Regular users' submissions wait for admin approval."""
    return service.create_faculty(
        current_user, name=name, description=description, university_id=university_id, image=image,
    )


@router.get("/faculties/{fac_id}/fields", response_model=List[FieldOfStudyOut])
def get_fields(fac_id: int, service: UniversityServiceDep):
    """List approved fields of study for a faculty."""
    return service.list_fields(fac_id)


@router.post("/fields", response_model=FieldOfStudyOut)
def create_field(data: FieldOfStudyCreate, current_user: CurrentUser, service: UniversityServiceDep):
    """Create a field of study. Regular users' submissions wait for admin approval."""
    return service.create_field(current_user, data)


@router.get("/fields/{field_id}/subjects", response_model=List[SubjectOut])
def get_subjects(field_id: int, service: UniversityServiceDep, semester: Optional[int] = None):
    """List approved subjects for a field. Supports optional semester filtering."""
    return service.list_subjects(field_id, semester)


@router.post("/subjects", response_model=SubjectOut)
def create_subject(data: SubjectCreate, current_user: CurrentUser, service: UniversityServiceDep):
    """Create a subject. Regular users' submissions wait for admin approval."""
    return service.create_subject(current_user, data)


@router.get("/universities/{uni_id}/reviews", response_model=List[ReviewOut])
def get_university_reviews(uni_id: int, service: UniversityServiceDep):
    """List reviews for a university."""
    return service.list_reviews(uni_id)


@router.post("/universities/{uni_id}/image_request")
def request_image_change(
    uni_id: int, current_user: CurrentUser, service: UniversityServiceDep, image: UploadFile = File(...)
):
    """Submit an image change request for a university."""
    request = service.request_image_change(current_user, uni_id, image)
    return {"msg": "Image request submitted", "id": request.id}
