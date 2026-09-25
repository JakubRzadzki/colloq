"""Admin-only management of users, reports and feedback."""
from __future__ import annotations

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.exceptions import DomainError, NotFoundError
from app.models import Feedback, Report, User

REPORT_STATUSES = ("pending", "resolved", "dismissed")
FINAL_REPORT_STATUSES = ("resolved", "dismissed")


class AdminService:
    def __init__(self, db: Session):
        self.db = db

    def list_users(self) -> list[User]:
        return self.db.query(User).order_by(User.created_at.desc()).all()

    def set_banned(self, admin: User, user_id: int, banned: bool) -> None:
        target = self.db.get(User, user_id)
        if target is None:
            raise NotFoundError("User not found")
        if target.id == admin.id:
            raise DomainError("Cannot ban yourself")
        if target.is_admin:
            raise DomainError("Cannot ban an admin")
        target.is_banned = banned
        self.db.commit()

    def list_reports(self, status: str | None) -> list[Report]:
        query = self.db.query(Report).order_by(desc(Report.created_at))
        if status in REPORT_STATUSES:
            query = query.filter(Report.status == status)
        return query.all()

    def update_report_status(self, report_id: int, status: str) -> None:
        if status not in FINAL_REPORT_STATUSES:
            raise DomainError("Status must be resolved or dismissed")
        report = self.db.get(Report, report_id)
        if report is None:
            raise NotFoundError("Report not found")
        report.status = status
        self.db.commit()

    def list_feedback(self) -> list[Feedback]:
        return self.db.query(Feedback).order_by(desc(Feedback.created_at)).all()
