"""Rate limiting configuration."""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Disable rate limiting if testing (using local sqlite or given a TEST flag)
is_test = "sqlite" in settings.DATABASE_URL
limiter = Limiter(
    key_func=get_remote_address, 
    default_limits=[settings.RATE_LIMIT_PER_MINUTE],
    enabled=not is_test
)
