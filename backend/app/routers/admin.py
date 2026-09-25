"""Admin: pending items, approve/reject (with file cleanup), users, reports, feedback."""
from typing import List, Optional

from fastapi import APIRouter, File, Form, Response, UploadFile

from app.core.deps import AdminServiceDep, AdminUser, ModerationServiceDep, Page, UniversityServiceDep
from app.schemas import (
    BanUserBody,
    FeedbackOut,
    PendingItemsResponse,
    ReportOut,
    UniversityOut,
    UserOut,
)
from app.services.moderation import ItemType

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/pending_items", response_model=PendingItemsResponse)
def get_pending_items(current_user: AdminUser, service: ModerationServiceDep):
    """List all pending items for admin review."""
    return service.pending_items()


@router.get("/users", response_model=List[UserOut])
def admin_get_users(page: Page, response: Response, current_user: AdminUser, service: AdminServiceDep):
    """List users, newest first (admin only). The total count is in X-Total-Count."""
    users, total = service.list_users(page)
    response.headers["X-Total-Count"] = str(total)
    return users


@router.patch("/users/{user_id}/ban")
def admin_ban_user(user_id: int, body: BanUserBody, current_user: AdminUser, service: AdminServiceDep):
    """Ban or unban a user. Cannot ban self or another admin."""
    service.set_banned(current_user, user_id, body.banned)
    return {"msg": "User banned" if body.banned else "User unbanned", "user_id": user_id}


@router.post("/approve/{item_type}/{item_id}")
def approve_item(item_type: ItemType, item_id: int, current_user: AdminUser, service: ModerationServiceDep):
    """Approve a pending item. Already approved items return 409."""
    service.approve(item_type, item_id)
    return {"msg": f"{item_type.value} approved"}


@router.delete("/reject/{item_type}/{item_id}")
def reject_item(item_type: ItemType, item_id: int, current_user: AdminUser, service: ModerationServiceDep):
    """Reject and delete a pending item and its files. Approved items return 409."""
    service.reject(item_type, item_id)
    return {"msg": f"{item_type.value} rejected"}


@router.get("/reports", response_model=List[ReportOut])
def admin_list_reports(
    page: Page, response: Response, current_user: AdminUser, service: AdminServiceDep, status_filter: Optional[str] = None
):
    """List reports, newest first (admin only). The total count is in X-Total-Count."""
    reports, total = service.list_reports(status_filter, page)
    response.headers["X-Total-Count"] = str(total)
    return reports


@router.patch("/reports/{report_id}")
def admin_update_report(report_id: int, status: str, current_user: AdminUser, service: AdminServiceDep):
    """Set report status to resolved or dismissed."""
    service.update_report_status(report_id, status)
    return {"msg": "Report updated", "status": status}


@router.get("/feedback", response_model=List[FeedbackOut])
def admin_list_feedback(page: Page, response: Response, current_user: AdminUser, service: AdminServiceDep):
    """List user feedback, newest first (admin only). The total count is in X-Total-Count."""
    feedback, total = service.list_feedback(page)
    response.headers["X-Total-Count"] = str(total)
    return feedback


@router.post("/approve_image_request/{req_id}")
def approve_image_request(req_id: int, current_user: AdminUser, service: ModerationServiceDep):
    """Approve a pending image change request; the previous local image is deleted."""
    service.approve_image_request(req_id)
    return {"msg": "Image request approved"}


@router.post("/reject_image_request/{req_id}")
def reject_image_request(req_id: int, current_user: AdminUser, service: ModerationServiceDep):
    """Reject a pending image change request and delete the uploaded file."""
    service.reject_image_request(req_id)
    return {"msg": "Image request rejected"}


@router.patch("/universities/{uni_id}/image")
def admin_update_university_image(
    uni_id: int, current_user: AdminUser, service: UniversityServiceDep, image: UploadFile = File(...)
):
    """Directly update university image (admin only)."""
    uni = service.admin_update_university_image(uni_id, image)
    return {"msg": "Image updated", "image_url": UniversityOut.model_validate(uni).image_url}


@router.put("/universities/{uni_id}")
def admin_update_university(
    uni_id: int,
    current_user: AdminUser,
    service: UniversityServiceDep,
    name: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    region: Optional[str] = Form(None),
    country: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    banner: Optional[UploadFile] = File(None),
):
    """Update university details (admin only)."""
    uni = service.admin_update_university(
        uni_id, name=name, city=city, region=region, country=country,
        description=description, image=image, banner=banner,
    )
    out = UniversityOut.model_validate(uni)
    return {"msg": "University updated", "university": out.model_dump(
        include={"id", "name", "city", "region", "country", "description", "image_url", "banner_url"}
    )}
