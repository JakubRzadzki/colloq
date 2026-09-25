"""Admin-only management of users, reports and feedback."""
from __future__ import annotations

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.exceptions import DomainError, NotFoundError
from app.core.sql import paginate
from app.models import Feedback, Report, User
from app.schemas import PageParams

REPORT_STATUSES = ("pending", "resolved", "dismissed")
FINAL_REPORT_STATUSES = ("resolved", "dismissed")


class AdminService:
    def __init__(self, db: Session):
        self.db = db

    def list_users(self, page: PageParams) -> tuple[list[User], int]:
        query = self.db.query(User).order_by(User.created_at.desc(), User.id.desc())
        return paginate(query, page.limit, page.offset)

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

    def list_reports(self, status: str | None, page: PageParams) -> tuple[list[Report], int]:
        query = self.db.query(Report).order_by(desc(Report.created_at), desc(Report.id))
        if status in REPORT_STATUSES:
            query = query.filter(Report.status == status)
        return paginate(query, page.limit, page.offset)

    def update_report_status(self, report_id: int, status: str) -> None:
        if status not in FINAL_REPORT_STATUSES:
            raise DomainError("Status must be resolved or dismissed")
        report = self.db.get(Report, report_id)
        if report is None:
            raise NotFoundError("Report not found")
        report.status = status
        self.db.commit()

    def list_feedback(self, page: PageParams) -> tuple[list[Feedback], int]:
        query = self.db.query(Feedback).order_by(desc(Feedback.created_at), desc(Feedback.id))
        return paginate(query, page.limit, page.offset)
