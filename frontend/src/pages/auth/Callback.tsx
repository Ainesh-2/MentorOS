import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, LoadingState } from "@/components/primitives";
import { supabase } from "@/lib/supabase";
import { loginToBackend } from "@/lib/auth";

export default function Callback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-session">("loading");
  const [message, setMessage] = useState("Restoring your sign-in session…");

  useEffect(() => {
    async function restoreSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Supabase callback error", error);
        setStatus("error");
        setMessage("Unable to restore your sign-in session. Please try again.");
        return;
      }

      if (data?.session?.user?.email) {
        // Exchange Supabase access token for internal backend JWT
        try {
          const accessToken = data.session.access_token;
          if (accessToken) {
            await loginToBackend(accessToken);
          }
          setStatus("success");
          setMessage(`Signed in as ${data.session.user.email}. Redirecting now…`);
          window.setTimeout(() => navigate("/app/mentor"), 900);
          return;
        } catch (err) {
          console.error("Backend login failed", err);
          setStatus("error");
          setMessage("Signed in with Supabase, but backend login failed. Check console.");
          return;
        }
        return;
      }

      setStatus("no-session");
      setMessage("No active session was found. Try signing in again.");
    }

    restoreSession();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-snow px-4 py-16">
      <div className="mx-auto max-w-xl rounded-3xl border border-ink/5 bg-white p-10 shadow-lg shadow-ink/5">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-soft">Google sign-in</p>
          <h1 className="mt-4 text-2xl font-semibold text-ink">Authenticating your session</h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{message}</p>
        </div>

        {status === "loading" ? (
          <div className="flex items-center justify-center">
            <LoadingState label="Finishing sign-in…" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-ink/5 p-5 text-sm text-ink-soft">{message}</div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate("/")} variant="secondary" type="button">
                Back to landing
              </Button>
              <Button onClick={() => navigate("/app/mentor")} type="button" disabled={status !== "success"}>
                Continue to app
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
