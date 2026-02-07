"""
Optional async seed for v1 API: one university, faculty, major, subject, and admin user.
Called from main_v1 lifespan if desired.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import Region, UserRole
from app.db.database import AsyncSessionLocal
from app.domain.models import Faculty, Major, Subject, University, User
from app.api.deps import get_password_hash


async def run_seed_async() -> None:
    """Seed minimal hierarchy and admin if empty."""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(University).limit(1))
            if result.scalar_one_or_none():
                return  # Already seeded

            uni = University(
                name="Politechnika Krakowska",
                slug="politechnika-krakowska",
                region=Region.MALOPOLSKIE,
                is_active=True,
            )
            db.add(uni)
            await db.flush()

            fac = Faculty(name="Wydział Informatyki i Telekomunikacji", university_id=uni.id)
            db.add(fac)
            await db.flush()

            major = Major(name="Informatyka", faculty_id=fac.id)
            db.add(major)
            await db.flush()

            subj = Subject(name="Bazy Danych", major_id=major.id, semester=3)
            db.add(subj)
            await db.flush()

            admin = User(
                email="admin@colloq.local",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_verified_student=True,
            )
            db.add(admin)
            await db.commit()
        except Exception:
            await db.rollback()
            raise
