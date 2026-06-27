from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import relationship

from backend.app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AuditLog(Base):
    """
    Immutable record of state-changing actions performed by staff
    (admin / HOD / mentor). Required for DPDP Act 2023 accountability.

    `user_id` is nullable so that system-triggered actions (e.g. a batch
    recompute with no human actor) can still be recorded.
    """

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    # Avoid the reserved attribute name `metadata`; store extra context here.
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=_utcnow, nullable=False)

    user = relationship("User")
