from typing import Any, Optional

from sqlalchemy.orm import Session

from backend.app.models.audit import AuditLog


def write_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[Any] = None,
    ip_address: Optional[str] = None,
    details: Optional[dict] = None,
) -> None:
    """
    Append an audit record. Used inside state-changing endpoints, which pass
    their own request-scoped `db` session. Never raises — an audit failure
    must not break the underlying action.
    """
    try:
        log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            ip_address=ip_address,
            details=details,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
