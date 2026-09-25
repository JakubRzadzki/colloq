"""Unit tests for escape_like, NoteFilters and NormalizedPath."""
from datetime import datetime

import pytest
from pydantic import BaseModel, ValidationError

from app.core.sql import escape_like
from app.schemas import NormalizedPath, NoteFilters, NoteSort


@pytest.mark.parametrize(
    ("raw", "escaped"),
    [
        ("plain", "plain"),
        ("100%", "100\\%"),
        ("a_b", "a\\_b"),
        ("back\\slash", "back\\\\slash"),
        ("%_\\", "\\%\\_\\\\"),
    ],
)
def test_escape_like(raw, escaped):
    assert escape_like(raw) == escaped


def test_note_filters_defaults():
    f = NoteFilters()

    assert f.page == 1 and f.page_size == 20
    assert f.sort is NoteSort.date
    assert f.tag_ids == []


@pytest.mark.parametrize(("raw", "parsed"), [("1,2,3", [1, 2, 3]), (["4,5"], [4, 5]), (["6", "7"], [6, 7]), ("", [])])
def test_note_filters_parses_comma_separated_tag_ids(raw, parsed):
    assert NoteFilters(tag_ids=raw).tag_ids == parsed


def test_note_filters_parses_dates():
    f = NoteFilters(date_from="2024-01-01T00:00:00Z", date_to="2024-02-01")

    assert f.date_from == datetime.fromisoformat("2024-01-01T00:00:00+00:00")
    assert f.date_to.date().isoformat() == "2024-02-01"


@pytest.mark.parametrize(
    "kwargs",
    [
        {"date_from": "not-a-date"},
        {"page": 0},
        {"page_size": 0},
        {"page_size": 101},
        {"sort": "random"},
        {"tag_ids": "1,x"},
    ],
)
def test_note_filters_rejects_invalid_values(kwargs):
    with pytest.raises(ValidationError):
        NoteFilters(**kwargs)


def test_note_filters_blank_search_is_none():
    assert NoteFilters(search="   ").search is None
    assert NoteFilters(search="  algebra ").search == "algebra"


class _PathModel(BaseModel):
    url: NormalizedPath = None


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("https://example.com/a.png", "https://example.com/a.png"),
        ("http://example.com//a.png", "http://example.com//a.png"),
        ("/uploads\\notes\\a.png", "/uploads/notes/a.png"),
        ("/uploads//notes/a.png", "/uploads/notes/a.png"),
        (None, None),
    ],
)
def test_normalized_path(raw, expected):
    assert _PathModel(url=raw).url == expected
