"""Admin: pending items, approve/reject (with file cleanup), reports, feedback."""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile  # noqa: F401 File, UploadFile
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_active_admin
from app.models import (
    User,
    University,
    Faculty,
    FieldOfStudy,
    Subject,
    Note,
    NoteImage,
    ImageRequest,
    Report,
    Feedback,
)
from app.schemas import (
    UserOut,
    PendingItemsResponse,
    ImageRequestOut,
    ReportOut,
    FeedbackOut,
    BanUserBody,
)
from app.services.file_manager import delete_file

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/pending_items", response_model=PendingItemsResponse)
async def get_pending_items(
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
):
    """List all pending items for admin review."""
    notes = db.query(Note).options(
        joinedload(Note.subject),
        joinedload(Note.university),
        joinedload(Note.author),
        joinedload(Note.images),
    ).filter(Note.is_approved == False).all()
    universities = db.query(University).filter(University.is_approved == False).all()
    faculties = db.query(Faculty).options(joinedload(Faculty.university)).filter(Faculty.is_approved == False).all()
    fields = db.query(FieldOfStudy).options(
        joinedload(FieldOfStudy.faculty).joinedload(Faculty.university),
    ).filter(FieldOfStudy.is_approved == False).all()
    subjects = db.query(Subject).options(
        joinedload(Subject.field_of_study).joinedload(FieldOfStudy.faculty).joinedload(Faculty.university),
    ).filter(Subject.is_approved == False).all()
    image_requests_raw = db.query(ImageRequest).options(
        joinedload(ImageRequest.university),
    ).filter(ImageRequest.status == "pending").all()
    image_requests = [
        ImageRequestOut(
            id=r.id,
            university_id=r.university_id,
            new_image_url=r.new_image_url,
            status=r.status,
            submitted_by_id=r.submitted_by_id,
            created_at=r.created_at,
            university_name=r.university.name if r.university else None,
        )
        for r in image_requests_raw
    ]
    return PendingItemsResponse(
        notes=notes,
        universities=universities,
        faculties=faculties,
        fields=fields,
        subjects=subjects,
        image_requests=image_requests,
    )


@router.get("/users", response_model=List[UserOut])
async def admin_get_users(
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
):
    """List all users (admin only)."""
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/ban")
async def admin_ban_user(
    user_id: int,
    body: BanUserBody,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
):
    """Ban or unban a user. Cannot ban self or another admin."""
    banned = body.banned
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    if target.is_admin:
        raise HTTPException(status_code=400, detail="Cannot ban an admin")
    target.is_banned = banned
    db.commit()
    return {"msg": "User banned" if banned else "User unbanned", "user_id": user_id}


@router.post("/approve/{item_type}/{item_id}")
async def approve_item(
    item_type: str,
    item_id: int,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
):
    """Approve a pending item."""
    from app.models import Notification
    model_map = {
        "university": University,
        "faculty": Faculty,
        "field": FieldOfStudy,
        "subject": Subject,
        "note": Note,
    }
    model = model_map.get(item_type)
    if not model:
        raise HTTPException(status_code=400, detail="Invalid item type")
    item = db.query(model).filter(model.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_approved = True
    if item_type == "note" and hasattr(item, "user_id"):
        db.add(Notification(user_id=item.user_id, type="note_approved", message="Your note was approved.", related_id=item_id))
    db.commit()
    return {"msg": f"{item_type} approved"}


@router.delete("/reject/{item_type}/{item_id}")
async def reject_item(
    item_type: str,
    item_id: int,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
):
    """Reject and delete a pending item. Deletes associated files from disk."""
    model_map = {
        "university": University,
        "faculty": Faculty,
        "field": FieldOfStudy,
        "subject": Subject,
        "note": Note,
    }
    model = model_map.get(item_type)
    if not model:
        raise HTTPException(status_code=400, detail="Invalid item type")
    item = db.query(model).filter(model.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item_type == "university":
        if getattr(item, "image_url", None):
            delete_file(item.image_url)
        if getattr(item, "banner_url", None):
            delete_file(item.banner_url)
    elif item_type == "note":
        note = db.query(Note).options(joinedload(Note.images)).filter(Note.id == item_id).first()
        if note:
            if getattr(note, "image_url", None):
                delete_file(note.image_url)
            for img in note.images or []:
                if img.image_url:
                    delete_file(img.image_url)
    elif item_type == "faculty" and getattr(item, "image_url", None):
        delete_file(item.image_url)
    db.delete(item)
    db.commit()
    return {"msg": f"{item_type} rejected"}


@router.get("/reports", response_model=List[ReportOut])
async def admin_list_reports(
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None,
):
    """List all reports (admin only)."""
    q = db.query(Report).order_by(desc(Report.created_at))
    if status_filter in ("pending", "resolved", "dismissed"):
        q = q.filter(Report.status == status_filter)
    return q.all()


@router.patch("/reports/{report_id}")
async def admin_update_report(
    report_id: int,
    status: str,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
):
    """Set report status to resolved or dismissed."""
    if status not in ("resolved", "dismissed"):
        raise HTTPException(status_code=400, detail="Status must be resolved or dismissed")
    r = db.query(Report).filter(Report.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    r.status = status
    db.commit()
    return {"msg": "Report updated", "status": status}


@router.get("/feedback", response_model=List[FeedbackOut])
async def admin_list_feedback(
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
):
    """List all user feedback (admin only)."""
    return db.query(Feedback).order_by(desc(Feedback.created_at)).all()


@router.post("/approve_image_request/{req_id}")
async def approve_image_request(
    req_id: int,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
):
    """Approve an image change request for a university."""
    req = db.query(ImageRequest).filter(ImageRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    uni = db.query(University).filter(University.id == req.university_id).first()
    if uni:
        uni.image_url = req.new_image_url
    req.status = "approved"
    db.commit()
    return {"msg": "Image request approved"}


@router.post("/reject_image_request/{req_id}")
async def reject_image_request(
    req_id: int,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
):
    """Reject an image change request. Optionally delete the uploaded file."""
    req = db.query(ImageRequest).filter(ImageRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    delete_file(req.new_image_url)
    req.status = "rejected"
    db.commit()
    return {"msg": "Image request rejected"}


@router.patch("/universities/{uni_id}/image")
async def admin_update_university_image(
    uni_id: int,
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
):
    """Directly update university image (admin only)."""
    from app.services.file_manager import save_upload, normalize_stored_path
    from app.routers.universities import DIR_UNIVERSITIES
    uni = db.query(University).filter(University.id == uni_id).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    old_url = uni.image_url
    uni.image_url = save_upload(image, DIR_UNIVERSITIES)
    if old_url and old_url.startswith("/uploads"):
        delete_file(old_url)
    db.commit()
    db.refresh(uni)
    return {"msg": "Image updated", "image_url": normalize_stored_path(uni.image_url)}


@router.put("/universities/{uni_id}")
async def admin_update_university(
    uni_id: int,
    name: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    region: Optional[str] = Form(None),
    country: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    banner: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
):
    """Update university details (admin only)."""
    from app.services.file_manager import save_upload, normalize_stored_path
    from app.routers.universities import DIR_UNIVERSITIES
    uni = db.query(University).filter(University.id == uni_id).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    if name is not None:
        uni.name = name.strip()
    if city is not None:
        uni.city = city.strip()
    if region is not None:
        uni.region = region.strip()
    if country is not None:
        uni.country = country.strip()
    if description is not None:
        uni.description = description.strip() if description else None
    if image and image.filename:
        old_url = uni.image_url
        uni.image_url = save_upload(image, DIR_UNIVERSITIES)
        if old_url and old_url.startswith("/uploads"):
            delete_file(old_url)
    if banner and banner.filename:
        old_url = uni.banner_url
        uni.banner_url = save_upload(banner, DIR_UNIVERSITIES)
        if old_url and old_url.startswith("/uploads"):
            delete_file(old_url)
    db.commit()
    db.refresh(uni)
    return {"msg": "University updated", "university": {
        "id": uni.id,
        "name": uni.name,
        "city": uni.city,
        "region": uni.region,
        "country": uni.country,
        "description": uni.description,
        "image_url": normalize_stored_path(uni.image_url) if uni.image_url else None,
        "banner_url": normalize_stored_path(uni.banner_url) if uni.banner_url else None,
    }}
