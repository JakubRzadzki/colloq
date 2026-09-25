"""In-app notifications of the current user."""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy import desc

from app.core.deps import CurrentUser, DbSession
from app.models import Notification
from app.schemas import NotificationOut

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=list[NotificationOut])
def get_notifications(current_user: CurrentUser, db: DbSession, unread_only: bool = False):
    """List current user notifications."""
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    return q.order_by(desc(Notification.created_at)).limit(50).all()


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: CurrentUser, db: DbSession):
    """Mark a notification as read."""
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"msg": "Marked as read"}


@router.patch("/notifications/read-all")
def mark_all_notifications_read(current_user: CurrentUser, db: DbSession):
    """Mark all notifications as read."""
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.read_at.is_(None)).update({Notification.read_at: datetime.now(timezone.utc)})
    db.commit()
    return {"msg": "All marked as read"}
