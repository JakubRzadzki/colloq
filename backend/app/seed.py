"""
Colloq Database Seeder
Auto-populates the database with Politechnika Krakowska, faculties, subjects, and admin user.
Runs on application startup.
"""
from .database import SessionLocal
from .models import User, University, Faculty, FieldOfStudy, Subject
from .auth import get_password_hash


def run_seed() -> None:
    """Seed the database with Politechnika Krakowska and AdminPK user if not present."""
    try:
        db = SessionLocal()
    except Exception as e:
        print(f"[SEED] WARNING: Could not connect to database: {e}")
        return
    try:
        # Check if Politechnika Krakowska already exists
        pk = db.query(University).filter(University.name.ilike("%Politechnika Krakowska%")).first()
        if not pk:
            pk = University(
                name="Politechnika Krakowska im. Tadeusza Kościuszki",
                name_pl="Politechnika Krakowska",
                name_en="Cracow University of Technology",
                city="Kraków",
                region="Małopolskie",
                country="Poland",
                description="Publiczna uczelnia techniczna w Krakowie, kształcąca inżynierów i magistrów na 8 wydziałach. Znana z wysokiego poziomu nauczania architektury oraz inżynierii lądowej.",
                image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Politechnika_Krakowska_logo.svg/1200px-Politechnika_Krakowska_logo.svg.png",
                banner_url="https://upload.wikimedia.org/wikipedia/commons/e/e3/Politechnika_Krakowska_Kampus_Glowny_Wydzial_Inzynierii_Ladowej.jpg",
                is_approved=True,
            )
            db.add(pk)
            db.commit()
            db.refresh(pk)
            print(f"[SEED] Created university: {pk.name}")

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
            db.commit()
            print("[SEED] Created faculties, fields of study, and subjects for Politechnika Krakowska")

        # AdminPK user
        admin_pk = db.query(User).filter(User.email == "admin@pk.edu.pl").first()
        if not admin_pk:
            pk_uni = pk if pk else db.query(University).filter(University.name.ilike("%Politechnika Krakowska%")).first()
            admin_pk = User(
                email="admin@pk.edu.pl",
                nickname="AdminPK",
                hashed_password=get_password_hash("admin123_secure"),
                bio="Administrator systemu dla Politechniki Krakowskiej.",
                is_admin=True,
                is_verified=True,
                reputation_points=1000,
                university_id=pk_uni.id if pk_uni is not None else None,
            )
            db.add(admin_pk)
            db.commit()
            print("[SEED] Created admin user: admin@pk.edu.pl / admin123_secure")

        # Fallback: Colloq Academy and admin@colloq.pl if DB is completely empty
        if db.query(University).count() == 0:
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
            db.commit()
            db.refresh(colloq)
        if not db.query(User).filter(User.email == "admin@colloq.pl").first():
            admin = User(
                email="admin@colloq.pl",
                nickname="admin",
                hashed_password=get_password_hash("password"),
                bio="Default administrator account.",
                is_admin=True,
                is_verified=True,
            )
            db.add(admin)
            db.commit()
            print("[SEED] Created fallback admin: admin@colloq.pl / password")
    except Exception as e:
        print(f"[SEED] WARNING: Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()
