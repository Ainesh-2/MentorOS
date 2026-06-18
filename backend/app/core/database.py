from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

# For SQLite fallback if postgresql is not configured locally,
# we can support standard configuration here:
engine = create_engine(
    settings.DATABASE_URL,
    # Needed for SQLite fallback if used in local development
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator:
    """
    Dependency generator that provides a database session and ensures
    it gets closed after a request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
