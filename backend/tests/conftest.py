import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.core import database
from backend.app.core.database import Base, get_db
from backend.app.main import app

# Create in-memory SQLite database engine for fast testing,
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# The audit middleware opens its own session via `database.SessionLocal`
# (it bypasses the `get_db` dependency). Rebind it to the in-memory test
# engine so middleware writes land in the same DB the tests read.
database.engine = engine
database.SessionLocal = TestingSessionLocal


@pytest.fixture(scope="function")
def db():
    # Create the tables in the test database
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop the tables after the test runs
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    # Override get_db dependency to yield the test database session,
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
