"""
Lightweight migration for v1 schema changes.

Adds: notes.visibility, notes.subject_id nullable, users.uploaded_notes_count,
attachments.file_key, attachments.processing_status.
Run after pulling model changes. Uses raw SQL for portability.
"""
from sqlalchemy import text

from app.db.database import engine


async def run_migrate_v1() -> None:
    """Apply v1 schema migrations idempotently."""
    async with engine.begin() as conn:
        # Add notes.visibility
        await conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='notes' AND column_name='visibility')
                THEN
                    ALTER TABLE notes ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'private';
                END IF;
            END $$;
        """))
        # Make notes.subject_id nullable
        await conn.execute(text("""
            DO $$ BEGIN
                ALTER TABLE notes ALTER COLUMN subject_id DROP NOT NULL;
            EXCEPTION WHEN OTHERS THEN NULL;
            END $$;
        """))
        # Add users.uploaded_notes_count
        await conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='users' AND column_name='uploaded_notes_count')
                THEN
                    ALTER TABLE users ADD COLUMN uploaded_notes_count INTEGER NOT NULL DEFAULT 0;
                END IF;
            END $$;
        """))
        # Add attachments.file_key
        await conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='attachments' AND column_name='file_key')
                THEN
                    ALTER TABLE attachments ADD COLUMN file_key VARCHAR(1024);
                    UPDATE attachments SET file_key = COALESCE(file_url, 'legacy') WHERE file_key IS NULL;
                    ALTER TABLE attachments ALTER COLUMN file_key SET NOT NULL;
                END IF;
            END $$;
        """))
        # Add attachments.processing_status
        await conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='attachments' AND column_name='processing_status')
                THEN
                    ALTER TABLE attachments ADD COLUMN processing_status VARCHAR(20) NOT NULL DEFAULT 'completed';
                END IF;
            END $$;
        """))
        # Make attachments.file_size_bytes nullable
        await conn.execute(text("""
            DO $$ BEGIN
                ALTER TABLE attachments ALTER COLUMN file_size_bytes DROP NOT NULL;
            EXCEPTION WHEN OTHERS THEN NULL;
            END $$;
        """))
