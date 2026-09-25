"""
Move note attachments out of the public upload directory.

Attachments used to be written to UPLOAD_DIR/notes/<note_id>/..., which is served
publicly under /uploads. They now live in PRIVATE_UPLOAD_DIR under the same
relative path, so the stored NoteFile.file_url values stay valid.

Idempotent: files already moved are skipped, and a leftover public copy of a file
that already exists in the private directory is removed.

Usage (from backend/):
    python -m app.scripts.move_note_attachments            # move
    python -m app.scripts.move_note_attachments --dry-run  # only report
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from app.core.config import settings
from app.services.file_manager import DIR_NOTES


def move_note_attachments(public_dir: Path, private_dir: Path, dry_run: bool = False) -> dict[str, int]:
    stats = {"moved": 0, "already_private": 0}
    notes_dir = public_dir / DIR_NOTES
    if not notes_dir.is_dir():
        return stats
    # Attachments live in per-note folders (notes/<note_id>/); note images sit directly in notes/.
    for note_dir in sorted(p for p in notes_dir.iterdir() if p.is_dir() and p.name.isdigit()):
        for source in sorted(p for p in note_dir.rglob("*") if p.is_file()):
            target = private_dir / source.relative_to(public_dir)
            if target.exists():
                stats["already_private"] += 1
                if not dry_run:
                    source.unlink()
                continue
            stats["moved"] += 1
            if not dry_run:
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(source), str(target))
        if not dry_run:
            for folder in sorted((p for p in note_dir.rglob("*") if p.is_dir()), reverse=True):
                if not any(folder.iterdir()):
                    folder.rmdir()
            if not any(note_dir.iterdir()):
                note_dir.rmdir()
    return stats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.scripts.move_note_attachments")
    parser.add_argument("--dry-run", action="store_true", help="only report what would be moved")
    args = parser.parse_args(argv)

    public_dir = Path(settings.UPLOAD_DIR).resolve()
    private_dir = Path(settings.PRIVATE_UPLOAD_DIR).resolve()
    if private_dir == public_dir or private_dir.is_relative_to(public_dir):
        print("PRIVATE_UPLOAD_DIR must not be inside UPLOAD_DIR (it would still be served publicly).", file=sys.stderr)
        return 1

    stats = move_note_attachments(public_dir, private_dir, dry_run=args.dry_run)
    prefix = "[dry run] " if args.dry_run else ""
    print(f"{prefix}moved: {stats['moved']}, already private: {stats['already_private']}")
    print(f"{prefix}from {public_dir / DIR_NOTES} to {private_dir / DIR_NOTES}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
