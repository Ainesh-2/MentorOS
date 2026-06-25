from datetime import datetime, timezone

from jose import jwt, JWTError
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.core import database
from backend.app.core.config import settings
from backend.app.core.security import ALGORITHM
from backend.app.models.audit import AuditLog

AUDITED_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
SKIP_PATHS = {
    "/health",
    f"{settings.API_V1_STR}/auth/login",
    f"{settings.API_V1_STR}/auth/logout",
}


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Records every successful state-changing request to the audit log.

    Endpoints also write richer, domain-specific audit rows via
    `write_audit(...)`; this middleware is the coarse safety net that
    guarantees no mutating staff action goes unrecorded.

    The DB session is resolved through `database.SessionLocal` at call time
    (not import time) so the test suite can rebind it to the in-memory engine.
    Any failure here is swallowed — auditing must never break a request.
    """

    async def dispatch(self, request, call_next):
        response = await call_next(request)

        if (
            request.method in AUDITED_METHODS
            and request.url.path not in SKIP_PATHS
            and response.status_code < 400
        ):
            db = None
            try:
                auth = request.headers.get("Authorization", "")
                token = auth[7:] if auth.lower().startswith("bearer ") else ""
                user_id = None
                if token:
                    try:
                        payload = jwt.decode(
                            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
                        )
                        sub = payload.get("sub")
                        user_id = int(sub) if sub is not None else None
                    except (JWTError, ValueError, TypeError):
                        user_id = None

                parts = request.url.path.strip("/").split("/")
                # paths look like api/v1/<entity>/...
                entity_type = parts[2] if len(parts) > 2 else "unknown"

                db = database.SessionLocal()
                db.add(
                    AuditLog(
                        user_id=user_id,
                        action=f"{request.method} {request.url.path}",
                        entity_type=entity_type,
                        ip_address=request.client.host if request.client else None,
                        timestamp=datetime.now(timezone.utc),
                    )
                )
                db.commit()
            except Exception:
                if db is not None:
                    try:
                        db.rollback()
                    except Exception:
                        pass
            finally:
                if db is not None:
                    db.close()

        return response
