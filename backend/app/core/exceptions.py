"""Domain exceptions raised by services and translated to HTTP responses in main.py.

Services raise these instead of HTTPException so they stay independent of FastAPI.
"""


class DomainError(Exception):
    status_code = 400

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class NotFoundError(DomainError):
    status_code = 404


class PermissionDeniedError(DomainError):
    status_code = 403


class ConflictError(DomainError):
    status_code = 409


class AuthenticationError(DomainError):
    status_code = 401
