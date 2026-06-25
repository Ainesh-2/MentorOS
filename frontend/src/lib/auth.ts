import { supabase } from "./supabase";

export async function signInWithGoogle() {
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export function getSession() {
  return supabase.auth.getSession();
}
