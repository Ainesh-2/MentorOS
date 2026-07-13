from supabase import create_client, Client
from backend.app.core.config import settings


def get_supabase_client() -> Client:
    """
    Returns a Supabase service-role client for server-side storage operations.
    Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
