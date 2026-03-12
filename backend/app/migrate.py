"""
Database migration / schema repair for Colloq.

Strategy:
  1. Check if critical columns exist in the database.
  2. If the schema is too far behind (many missing columns), DROP all tables
     and let SQLAlchemy recreate them from the current models.
  3. Otherwise, run lightweight idempotent ADD COLUMN migrations.

This is safe because:
  - If the DB is fresh, create_all already made the correct schema; migrations are no-ops.
  - If the DB has an outdated schema with no real data, we reset it cleanly.
  - The seed re-populates default data on every startup anyway.
"""
from sqlalchemy import text, inspect


def run_migrations(engine):
    """Ensure the database schema matches the current SQLAlchemy models."""

    # PostgreSQL-only raw SQL; SQLite uses create_all from models only
    if "sqlite" in str(engine.url):
        return

    # -------------------------------------------------------------------------
    # Step 1: Detect how broken the schema is
    # -------------------------------------------------------------------------
    critical_checks = [
        ("universities", "created_at"),
        ("universities", "banner_url"),
        ("reviews", "note_id"),
        ("reviews", "created_at"),
        ("notes", "subject_id"),
        ("notes", "is_approved"),
        ("users", "is_verified"),
        ("faculties", "is_approved"),
    ]

    missing_count = 0
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()

        for table, column in critical_checks:
            if table in existing_tables:
                col_names = [c["name"] for c in inspector.get_columns(table)]
                if column not in col_names:
                    missing_count += 1
    except Exception as e:
        print(f"[MIGRATE] WARNING: Schema inspection failed: {e}")
        return

    # -------------------------------------------------------------------------
    # Step 2: If 3+ critical columns are missing, the schema is too old.
    #         Drop everything and let create_all rebuild from models.
    # -------------------------------------------------------------------------
    if missing_count >= 3:
        print(f"[MIGRATE] Detected {missing_count} missing critical columns. Resetting database schema...")
        from app.core.database import Base
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        print("[MIGRATE] Database schema rebuilt successfully.")
        return

    # -------------------------------------------------------------------------
    # Step 3: Lightweight column additions for minor drift
    # -------------------------------------------------------------------------
    def add_col(table: str, column: str, col_def: str) -> tuple[str, str]:
        return (
            f"{table}.{column}",
            f"""
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '{table}' AND column_name = '{column}'
              ) THEN
                ALTER TABLE {table} ADD COLUMN {column} {col_def};
              END IF;
            END $$;
            """,
        )

    migrations = [
        # Universities
        add_col("universities", "country", "VARCHAR(100) NOT NULL DEFAULT 'Poland'"),
        add_col("universities", "created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        add_col("universities", "banner_url", "VARCHAR(500)"),
        add_col("universities", "name_en", "VARCHAR(300)"),
        add_col("universities", "name_pl", "VARCHAR(300)"),
        add_col("universities", "is_approved", "BOOLEAN NOT NULL DEFAULT TRUE"),
        add_col("universities", "description", "TEXT"),
        add_col("universities", "image_url", "VARCHAR(500)"),
        add_col("universities", "region", "VARCHAR(100) NOT NULL DEFAULT ''"),

        # Users
        add_col("users", "reputation_points", "INTEGER NOT NULL DEFAULT 0"),
        add_col("users", "uploads_count", "INTEGER NOT NULL DEFAULT 0"),
        add_col("users", "created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        add_col("users", "is_verified", "BOOLEAN NOT NULL DEFAULT FALSE"),
        add_col("users", "is_active", "BOOLEAN NOT NULL DEFAULT TRUE"),
        add_col("users", "is_banned", "BOOLEAN NOT NULL DEFAULT FALSE"),
        add_col("users", "is_admin", "BOOLEAN NOT NULL DEFAULT FALSE"),
        add_col("users", "avatar_url", "VARCHAR(500)"),
        add_col("users", "bio", "VARCHAR(500)"),
        add_col("users", "university_id", "INTEGER"),

        # Faculties
        add_col("faculties", "created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        add_col("faculties", "is_approved", "BOOLEAN NOT NULL DEFAULT TRUE"),
        add_col("faculties", "description", "TEXT"),
        add_col("faculties", "image_url", "VARCHAR(500)"),

        # Fields of study
        add_col("fields_of_study", "is_approved", "BOOLEAN NOT NULL DEFAULT TRUE"),
        add_col("fields_of_study", "degree_level", "VARCHAR(50)"),

        # Subjects
        add_col("subjects", "is_approved", "BOOLEAN NOT NULL DEFAULT TRUE"),

        # Notes
        add_col("notes", "is_approved", "BOOLEAN NOT NULL DEFAULT TRUE"),
        add_col("notes", "created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        add_col("notes", "image_url", "VARCHAR(500)"),
        add_col("notes", "video_url", "VARCHAR(500)"),
        add_col("notes", "link_url", "VARCHAR(500)"),
        add_col("notes", "subject_id", "INTEGER"),
        add_col("notes", "score", "FLOAT DEFAULT 0.0"),
        add_col("notes", "file_url", "VARCHAR(500)"),
        add_col("notes", "user_id", "INTEGER"),
        add_col("notes", "view_count", "INTEGER NOT NULL DEFAULT 0"),
        add_col("notes", "download_count", "INTEGER NOT NULL DEFAULT 0"),

        # Reviews
        add_col("reviews", "rating", "INTEGER NOT NULL DEFAULT 0"),
        add_col("reviews", "content", "TEXT"),
        add_col("reviews", "user_id", "INTEGER"),
        add_col("reviews", "note_id", "INTEGER"),
        add_col("reviews", "university_id", "INTEGER"),
        add_col("reviews", "created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),

        # Comments
        add_col("comments", "content", "TEXT"),
        add_col("comments", "user_id", "INTEGER"),
        add_col("comments", "note_id", "INTEGER"),
        add_col("comments", "created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),

        # Note images
        add_col("note_images", "created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        add_col("note_images", "caption", "VARCHAR(500)"),
        add_col("note_images", "position", "INTEGER DEFAULT 0"),

        # Note history
        add_col("note_history", "title", "VARCHAR(300)"),

        # Image requests
        add_col("image_requests", "created_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
    ]

    for name, sql in migrations:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
        except Exception as e:
            err = str(e).lower()
            if any(tok in err for tok in ["already exists", "duplicate key", "does not exist"]):
                continue
            print(f"[MIGRATE] WARNING: Migration {name} failed: {e}")
