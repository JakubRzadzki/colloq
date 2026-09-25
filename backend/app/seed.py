"""
Colloq database seeder.
Populates reference data (Politechnika Krakowska with faculties, fields and subjects)
on startup. An admin account is created only in dev, from SEED_ADMIN_EMAIL /
SEED_ADMIN_PASSWORD; production admins are created with `python -m app.cli create-admin`.
"""
import logging
import secrets

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import Faculty, FieldOfStudy, Subject, University, User

logger = logging.getLogger(__name__)

PK_UNIVERSITY_NAME = "Politechnika Krakowska im. Tadeusza Kościuszki"


def run_seed(db: Session | None = None) -> None:
    """Seed reference data and, in dev only, the configured admin account.

    Idempotent. When no session is given, a new one is opened and closed here.
    """
    owns_session = db is None
    session = db if db is not None else SessionLocal()
    try:
        _seed_reference_data(session)
        _seed_dev_admin(session)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        if owns_session:
            session.close()


def _seed_reference_data(db: Session) -> None:
    pk = db.query(University).filter(University.name == PK_UNIVERSITY_NAME).first()
    if not pk:
        pk = University(
            name=PK_UNIVERSITY_NAME,
            name_pl="Politechnika Krakowska",
            name_en="Cracow University of Technology",
            city="Kraków",
            region="Małopolskie",
            country="Poland",
            description="Public technical university in Krakow, educating engineers and masters in 8 faculties. Known for high level of architecture and civil engineering education.",
            image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Politechnika_Krakowska_logo.svg/1200px-Politechnika_Krakowska_logo.svg.png",
            banner_url="https://upload.wikimedia.org/wikipedia/commons/e/e3/Politechnika_Krakowska_Kampus_Glowny_Wydzial_Inzynierii_Ladowej.jpg",
            is_approved=True,
        )
        db.add(pk)
        db.flush()  # assigns pk.id without committing
        logger.info("Seed: created university %s", pk.name)

        # Faculties with fields_of_study and subjects
        faculties_data = [
            {
                "name": "Wydział Informatyki i Telekomunikacji",
                "image_url": "https://wiit.pk.edu.pl/wp-content/uploads/2021/01/logo-wiit.png",
                "fields_of_study": [
                    {
                        "name": "Informatyka",
                        "degree_level": "Inżynierskie (I stopień)",
                        "subjects": [
                            ("Analiza Matematyczna 1", 1), ("Algebra Liniowa z Geometrią", 1),
                            ("Wstęp do Programowania (C/C++)", 1), ("Fizyka dla Informatyków", 1),
                            ("Algorytmy i Struktury Danych", 2), ("Architektura Komputerów", 2),
                            ("Programowanie Obiektowe (Java)", 2), ("Systemy Operacyjne", 3),
                            ("Bazy Danych", 3), ("Sieci Komputerowe", 4), ("Inżynieria Oprogramowania", 5),
                        ],
                    },
                    {
                        "name": "Matematyka Stosowana",
                        "degree_level": "Licencjackie (I stopień)",
                        "subjects": [
                            ("Wstęp do Logiki i Teorii Mnogości", 1), ("Analiza Matematyczna I", 1),
                            ("Algebra Liniowa I", 1), ("Topologia", 3), ("Równania Różniczkowe Zwyczajne", 4),
                            ("Statystyka Matematyczna", 5),
                        ],
                    },
                ],
            },
            {
                "name": "Wydział Architektury",
                "image_url": "https://upload.wikimedia.org/wikipedia/commons/6/64/Wydzia%C5%82_Architektury_PK.jpg",
                "fields_of_study": [
                    {
                        "name": "Architektura",
                        "degree_level": "Jednolite Magisterskie",
                        "subjects": [
                            ("Historia Architektury Powszechnej", 1), ("Rysunek Odręczny", 1),
                            ("Geometria Wykreślna", 1), ("Projektowanie Architektoniczne: Podstawy", 2),
                            ("Mechanika Budowli", 3), ("Budownictwo Ogólne i Materiałoznawstwo", 3),
                            ("Urbanistyka", 5),
                        ],
                    },
                    {
                        "name": "Architektura Krajobrazu",
                        "degree_level": "Inżynierskie (I stopień)",
                        "subjects": [
                            ("Biologia Roślin", 1), ("Rysunek i Rzeźba", 1), ("Szata Roślinna", 2),
                            ("Zasady Projektowania Krajobrazu", 3),
                        ],
                    },
                ],
            },
            {
                "name": "Wydział Inżynierii Lądowej",
                "image_url": "https://wil.pk.edu.pl/images/logo_WIL.png",
                "fields_of_study": [
                    {
                        "name": "Budownictwo",
                        "degree_level": "Inżynierskie (I stopień)",
                        "subjects": [
                            ("Matematyka", 1), ("Fizyka", 1), ("Geodezja i Kartografia", 2),
                            ("Mechanika Teoretyczna", 2), ("Wytrzymałość Materiałów", 3),
                            ("Technologia Betonu", 4), ("Mechanika Gruntów", 4),
                            ("Konstrukcje Metalowe", 5), ("Konstrukcje Betonowe", 5),
                        ],
                    },
                    {
                        "name": "Transport",
                        "degree_level": "Inżynierskie (I stopień)",
                        "subjects": [
                            ("Grafika Inżynierska", 1), ("Infrastruktura Transportu", 2),
                            ("Środki Transportu", 2), ("Inżynieria Ruchu", 4), ("Logistyka w Transporcie", 5),
                        ],
                    },
                ],
            },
            {
                "name": "Wydział Mechaniczny",
                "image_url": "https://mech.pk.edu.pl/wp-content/uploads/2016/10/WM_logo_PL_poziom_CMYK.jpg",
                "fields_of_study": [
                    {
                        "name": "Mechanika i Budowa Maszyn",
                        "degree_level": "Inżynierskie (I stopień)",
                        "subjects": [
                            ("Matematyka dla Inżynierów", 1), ("Grafika Inżynierska 3D (CAD)", 1),
                            ("Mechanika Ogólna", 2), ("Termodynamika", 3),
                            ("Podstawy Konstrukcji Maszyn", 4), ("Techniki Wytwarzania", 4),
                            ("Napędy Hydrauliczne i Pneumatyczne", 5),
                        ],
                    },
                    {
                        "name": "Automatyka i Robotyka",
                        "degree_level": "Inżynierskie (I stopień)",
                        "subjects": [
                            ("Obwody Elektryczne", 1), ("Teoria Sterowania", 3),
                            ("Podstawy Robotyki", 4), ("Programowanie Sterowników PLC", 5),
                            ("Systemy Wizyjne w Robotyce", 6),
                        ],
                    },
                ],
            },
            {
                "name": "Wydział Inżynierii i Technologii Chemicznej",
                "image_url": "https://chemia.pk.edu.pl/wp-content/uploads/2018/02/WIiTCh_logo_poziom_pl.png",
                "fields_of_study": [
                    {
                        "name": "Technologia Chemiczna",
                        "degree_level": "Inżynierskie (I stopień)",
                        "subjects": [
                            ("Chemia Ogólna i Nieorganiczna", 1), ("Chemia Analityczna", 2),
                            ("Chemia Organiczna", 3), ("Chemia Fizyczna", 4),
                            ("Inżynieria Chemiczna i Procesowa", 5),
                            ("Technologia Chemiczna Organiczna", 6),
                        ],
                    },
                ],
            },
        ]

        for fac_data in faculties_data:
            faculty = Faculty(
                name=fac_data["name"],
                image_url=fac_data.get("image_url"),
                university_id=pk.id,
                is_approved=True,
            )
            db.add(faculty)
            db.flush()
            for fos_data in fac_data["fields_of_study"]:
                field = FieldOfStudy(
                    name=fos_data["name"],
                    degree_level=fos_data.get("degree_level"),
                    faculty_id=faculty.id,
                    is_approved=True,
                )
                db.add(field)
                db.flush()
                for subj_name, sem in fos_data["subjects"]:
                    subj = Subject(
                        name=subj_name,
                        semester=sem,
                        field_of_study_id=field.id,
                        is_approved=True,
                    )
                    db.add(subj)
        db.flush()
        logger.info("Seed: created faculties, fields of study and subjects for %s", pk.name)

    # Fallback university if the DB is completely empty
    if (db.query(func.count(University.id)).scalar() or 0) == 0:
        colloq = University(
            name="Colloq Academy",
            name_en="Colloq Academy",
            name_pl="Colloq Akademia",
            city="Kraków",
            region="Małopolskie",
            country="Poland",
            description="Default university for Colloq platform.",
            image_url="https://placehold.co/400x200/5e5ce6/ffffff?text=Colloq+Academy",
            is_approved=True,
        )
        db.add(colloq)
        db.flush()


def _seed_dev_admin(db: Session) -> None:
    if settings.ENV != "dev":
        return
    email = (settings.SEED_ADMIN_EMAIL or "").strip().lower()
    password = settings.SEED_ADMIN_PASSWORD
    if not email or not password:
        return
    if db.query(User).filter(func.lower(User.email) == email).first():
        return
    nickname = email.split("@")[0]
    if db.query(User).filter(User.nickname == nickname).first():
        nickname = f"{nickname}_{secrets.token_hex(3)}"
    db.add(User(
        email=email,
        nickname=nickname,
        hashed_password=get_password_hash(password),
        is_admin=True,
        is_verified=True,
    ))
    db.flush()
    logger.info("Seed: created dev admin account %s", email)
