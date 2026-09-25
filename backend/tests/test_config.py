"""Tests for settings parsing and startup validation."""
import pytest

from app.core.config import Settings


def _settings(monkeypatch, **env: str) -> Settings:
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    return Settings(_env_file=None)


def test_allowed_origins_parsed_from_comma_separated_string(monkeypatch):
    s = _settings(monkeypatch, ALLOWED_ORIGINS="https://a.example, https://b.example,,")

    assert s.allowed_origins == ["https://a.example", "https://b.example"]


def test_env_defaults_to_prod(monkeypatch):
    monkeypatch.delenv("ENV", raising=False)

    assert Settings(_env_file=None).ENV == "prod"


def test_prod_rejects_short_secret_key(monkeypatch):
    s = _settings(monkeypatch, ENV="prod", SECRET_KEY="too-short")

    with pytest.raises(RuntimeError):
        s.validate_secret_key()


def test_prod_accepts_long_secret_key(monkeypatch):
    s = _settings(monkeypatch, ENV="prod", SECRET_KEY="x" * 32)

    s.validate_secret_key()


def test_dev_allows_short_secret_key_but_not_the_default(monkeypatch):
    assert _settings(monkeypatch, ENV="dev", SECRET_KEY="dev-secret").validate_secret_key() is None

    with pytest.raises(RuntimeError):
        _settings(monkeypatch, ENV="dev", SECRET_KEY="change-me-in-production").validate_secret_key()


def test_rate_limit_storage_defaults_to_memory_and_is_configurable(monkeypatch):
    assert Settings(_env_file=None).RATE_LIMIT_STORAGE_URI == "memory://"

    s = _settings(monkeypatch, RATE_LIMIT_STORAGE_URI="redis://redis:6379/0")

    assert s.RATE_LIMIT_STORAGE_URI == "redis://redis:6379/0"


def test_limiter_uses_configured_storage():
    from limits.storage import MemoryStorage

    from app.core.rate_limit import limiter

    assert isinstance(limiter._storage, MemoryStorage)
