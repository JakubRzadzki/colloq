"""Password hashing: bcrypt used directly, compatible with hashes created by passlib."""
import logging

from app.core.security import get_password_hash, verify_password

# Created with passlib's CryptContext(schemes=["bcrypt"]) before it was removed.
PASSLIB_HASH = "$2b$12$WFVZYaeLDAEsvxaAqGitf.dTH6qhgYPAzdrt3RHCwUpuXxZpPxEmW"


def test_existing_passlib_hashes_still_verify():
    assert verify_password("legacy-password-123", PASSLIB_HASH)
    assert not verify_password("wrong-password", PASSLIB_HASH)


def test_hash_roundtrip_and_salting():
    first, second = get_password_hash("s3cret-pass"), get_password_hash("s3cret-pass")

    assert first != second
    assert first.startswith("$2b$12$")
    assert verify_password("s3cret-pass", first)


def test_malformed_hash_does_not_verify():
    assert verify_password("anything", "not-a-bcrypt-hash") is False


def test_overlong_password_does_not_raise():
    # bcrypt 5 raises for > 72 bytes; login must simply fail instead of erroring.
    assert verify_password("x" * 200, PASSLIB_HASH) is False


def test_hashing_logs_no_errors(caplog):
    with caplog.at_level(logging.WARNING):
        verify_password("legacy-password-123", PASSLIB_HASH)
        get_password_hash("another-pass")

    assert not [r for r in caplog.records if r.levelno >= logging.WARNING]
