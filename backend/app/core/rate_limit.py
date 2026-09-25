"""Rate limiting configuration."""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Rate limiting is disabled only when running the test suite (TESTING=1).
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT_PER_MINUTE],
    storage_uri=settings.RATE_LIMIT_STORAGE_URI,
    enabled=not settings.TESTING,
)
