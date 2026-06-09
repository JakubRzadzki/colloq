"""Rate limiting configuration."""
import os

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Disable rate limiting only when running the test suite (TESTING=1).
is_test = os.getenv("TESTING") == "1"
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT_PER_MINUTE],
    enabled=not is_test
)
