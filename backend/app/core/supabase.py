from supabase import Client, create_client

from backend.app.core.config import settings

supabase_url = settings.SUPABASE_URL or "https://placeholder-project.supabase.co"
supabase_key = settings.SUPABASE_ANON_KEY or "placeholder-key"

supabase: Client = create_client(
    supabase_url,
    supabase_key,
)