from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "MentorOS API"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "supersecretkeychangeinproduction"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # DPDP / consent notice version stamped onto each consent decision.
    PRIVACY_NOTICE_VERSION: str = "1.0"

    # Celery / Redis (Phase 3 nightly scoring). Optional in dev — the recompute
    # endpoint falls back to synchronous computation when no broker is reachable.
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    CELERY_BROKER_CONNECTION_TIMEOUT: int = 2
    CELERY_BROKER_CONNECTION_RETRY: bool = False
    CELERY_TASK_ALWAYS_EAGER: bool = True
    CELERY_TASK_EAGER_PROPAGATES: bool = True
    # Current academic period used by the scoring engine.
    SCORING_PERIOD: str = "2025-ODD"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/mentoros"
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
