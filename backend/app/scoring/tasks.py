"""
Celery nightly scoring job (Phase 3).

Celery is an OPTIONAL dependency: the import is guarded so the FastAPI app and
test suite import cleanly even when celery/redis aren't installed. When Celery
is available, `celery_app` exposes the beat schedule (2 AM daily) and the two
tasks. The actual scoring logic lives in `scoring.engine` (no celery import),
and the admin endpoint falls back to running it synchronously.

Run in production:
    celery -A backend.app.scoring.tasks worker -l info
    celery -A backend.app.scoring.tasks beat   -l info
"""
import logging

from backend.app.core.config import settings
from backend.app.core import database
from backend.app.scoring.engine import ScoringEngine, recompute_and_store

logger = logging.getLogger(__name__)

try:  # pragma: no cover - exercised only when celery is installed
    from celery import Celery
    from celery.schedules import crontab

    CELERY_AVAILABLE = True
except ImportError:  # celery not installed (e.g. lightweight test env)
    Celery = None  # type: ignore
    crontab = None  # type: ignore
    CELERY_AVAILABLE = False


if CELERY_AVAILABLE:
    celery_app = Celery("mentoros", broker=settings.CELERY_BROKER_URL)
    celery_app.conf.update(
        result_backend=settings.CELERY_RESULT_BACKEND,
        timezone="UTC",
        enable_utc=True,
        broker_connection_timeout=settings.CELERY_BROKER_CONNECTION_TIMEOUT,
        broker_connection_retry=settings.CELERY_BROKER_CONNECTION_RETRY,
        task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,
        task_eager_propagates=settings.CELERY_TASK_EAGER_PROPAGATES,
        beat_schedule={
            "compute-all-scores-nightly": {
                "task": "backend.app.scoring.tasks.compute_all_scores",
                "schedule": crontab(hour=2, minute=0),
            }
        },
    )

    @celery_app.task(name="backend.app.scoring.tasks.compute_all_scores")
    def compute_all_scores(period: str = settings.SCORING_PERIOD):
        """Nightly batch: recompute + store every student's score."""
        db = database.SessionLocal()
        try:
            count = recompute_and_store(db, period)
            logger.info("Nightly scoring complete: %s students (period=%s)", count, period)
            return count
        except Exception:
            logger.exception("Nightly scoring failed")
            raise
        finally:
            db.close()

    @celery_app.task(name="backend.app.scoring.tasks.compute_score_for_student")
    def compute_score_for_student(student_id: int, period: str = settings.SCORING_PERIOD):
        """Recompute + store one student's score (e.g. after a CSV import)."""
        db = database.SessionLocal()
        try:
            return ScoringEngine(db).store_score(student_id, period)
        finally:
            db.close()

else:  # pragma: no cover - import-time shim when celery is absent
    celery_app = None
    compute_all_scores = None
    compute_score_for_student = None
