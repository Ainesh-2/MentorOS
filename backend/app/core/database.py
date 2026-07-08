import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings


def _build_engine():
    database_url = settings.DATABASE_URL
    if database_url and database_url.startswith("postgres"):
        try:
            return create_engine(database_url, pool_pre_ping=True)
        except Exception:
            pass

    sqlite_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mentoros_dev.sqlite3")
    os.makedirs(os.path.dirname(sqlite_path), exist_ok=True)
    return create_engine(
        f"sqlite:///{sqlite_path}",
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )


engine = _build_engine()

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
