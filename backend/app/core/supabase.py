from supabase import Client, create_client

from backend.app.core.config import settings
# debugging
#print("URL:", settings.SUPABASE_URL)
#print("ANON:", settings.SUPABASE_ANON_KEY[:20] if settings.SUPABASE_ANON_KEY else None)

supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_ANON_KEY,
)