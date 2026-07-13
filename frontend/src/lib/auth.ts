import { supabase } from "./supabase";

const ALLOWED_GOOGLE_DOMAIN = "mitwpu.edu.in";

export async function signInWithGoogle() {
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        prompt: "select_account",
        hd: ALLOWED_GOOGLE_DOMAIN,
      },
    },
  });
}

export async function signOut() {
  sessionStorage.removeItem("token");
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
  return { error };
}

export function getSession() {
  return supabase.auth.getSession();
}

export async function loginToBackend(accessToken: string) {
  const resp = await fetch(`/api/v1/auth/supabase/login`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Backend login failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  // store backend token for subsequent API calls (sessionStorage used for per-tab session)
  if (data?.access_token) {
    sessionStorage.setItem("token", data.access_token);
  }
  return data;
}
