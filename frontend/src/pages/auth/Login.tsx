import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, LogIn, Mail, Lock, UserPlus, Sparkles, ArrowRight, XCircle } from "lucide-react";
import { Button, Input } from "@/components/primitives";
import { Brand } from "@/components/Brand";
import { Background } from "@/components/layout/Background";
import { signInWithGoogle } from "@/lib/auth";
import { toast } from "@/store/useToast";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || "Request failed");
  }
  return data;
}

type Tab = "signin" | "signup";

export default function Login() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noLocalPassword, setNoLocalPassword] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      toast.error(err.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please enter email and password");
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch(`/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          const msg = data?.detail || "Incorrect email or password";
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }
        // Distinct case: account exists but has no local password (Google-only)
        if (response.status === 400 && data?.detail && data.detail.toLowerCase().includes("no local password")) {
          setNoLocalPassword(true);
          toast.info(data.detail);
          setLoading(false);
          return;
        }
        const msg = data?.detail || "Invalid credentials";
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      if (data?.access_token) {
        sessionStorage.setItem("token", data.access_token);
        toast.success("Welcome back!");
        navigate("/app/mentor");
      }
    } catch (err: any) {
      const msg = err.message || "Invalid credentials";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please fill in all fields");
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      toast.error("Password must be at least 6 characters long");
      return;
    }
    setLoading(true);
    try {
      const data = await postJson(`/api/v1/auth/register`, {
        email,
        password,
        full_name: email.split("@")[0],
        role: "Student",
      });

      if (data?.access_token) {
        sessionStorage.setItem("token", data.access_token);
        toast.success("Welcome to MentorOS! Account created.");
        navigate("/app/mentor");
      }
    } catch (err: any) {
      const msg = err.message || "Registration failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <div className="relative min-h-screen overflow-x-clip flex flex-col justify-between">
      <Background variant="landing" />

      {/* Nav header */}
      <header className="sticky top-0 z-30 border-b border-white/40 bg-snow/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button onClick={() => navigate("/")} aria-label="MentorOS home" className="rounded-sm">
            <Brand />
          </button>
          <Button onClick={() => navigate("/")} variant="secondary" iconLeft={<ArrowLeft size={16} />}>
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md rounded-3xl border border-ink/8 bg-white/70 backdrop-blur-md p-8 shadow-glass-strong"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-ink font-display">
              {activeTab === "signin" ? "Sign In to MentorOS" : "Create your Account"}
            </h1>
            <p className="text-sm text-ink-soft mt-2">
              {activeTab === "signin"
                ? "Access your personal success signals & dashboards"
                : "Register to start mapping your academic progression"}
            </p>
          </div>

          <div className="flex rounded-lg bg-ink/5 p-1 mb-6 relative">
            <button
              onClick={() => {
                setActiveTab("signin");
                setPassword("");
                setError(null);
              }}
              className={`relative z-10 w-1/2 py-2 text-caption font-semibold rounded-md transition-colors ${
                activeTab === "signin" ? "text-azure-600 font-bold" : "text-ink-soft hover:text-ink"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab("signup");
                setPassword("");
                setError(null);
              }}
              className={`relative z-10 w-1/2 py-2 text-caption font-semibold rounded-md transition-colors ${
                activeTab === "signup" ? "text-azure-600 font-bold" : "text-ink-soft hover:text-ink"
              }`}
            >
              Sign Up
            </button>

            <motion.div
              layoutId="activeTabIndicator"
              className="absolute top-1 bottom-1 left-1 bg-white rounded-md shadow-sm border border-ink/4"
              style={{
                width: "calc(50% - 4px)",
                x: activeTab === "signin" ? "0%" : "100%",
              }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === "signin" ? -15 : 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === "signin" ? 15 : -15 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "signin" ? (
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-signal-coral/10 border border-signal-coral/30 text-signal-coral rounded-lg p-3 text-caption flex items-start gap-2 overflow-hidden"
                    >
                      <XCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@school.edu"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    iconLeft={<Mail size={16} />}
                    disabled={loading}
                  />

                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    iconLeft={<Lock size={16} />}
                    disabled={loading}
                  />

                  <Button type="submit" block disabled={loading} iconRight={<LogIn size={16} />} className="h-11 shadow-sm">
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                  {noLocalPassword && (
                    <div className="mt-4 rounded-md border border-ink/8 bg-amber-50 p-3">
                      <p className="text-sm text-ink-soft">
                        This account was created via Google sign-in and has no local password set.
                        You can sign in with Google or request a password reset to set a local password.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Button onClick={handleGoogleSignIn} disabled={loading}>
                          Sign in with Google
                        </Button>
                        <Button variant="ghost" onClick={() => setNoLocalPassword(false)}>
                          Back
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-signal-coral/10 border border-signal-coral/30 text-signal-coral rounded-lg p-3 text-caption flex items-start gap-2 overflow-hidden"
                    >
                      <XCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="your-email@school.edu"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    iconLeft={<Mail size={16} />}
                    disabled={loading}
                  />

                  <Input
                    label="Choose Password"
                    type="password"
                    placeholder="At least 6 characters"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    iconLeft={<Lock size={16} />}
                    disabled={loading}
                  />

                  <Button type="submit" block disabled={loading} iconRight={<UserPlus size={16} />} className="h-11 shadow-sm">
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink/8"></div>
            </div>
            <span className="relative bg-white/70 px-3 text-[11px] font-medium uppercase tracking-wider text-ink-soft">
              or continue with
            </span>
          </div>

          <Button
            type="button"
            block
            variant="secondary"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex justify-center items-center gap-2 border border-ink/8 hover:bg-white transition-colors h-11"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" width="24" height="24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.58c-.28 1.48-1.11 2.73-2.36 3.58v2.96h3.8c2.23-2.05 3.51-5.07 3.51-8.39z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.8-2.96c-1.05.7-2.4 1.12-4.16 1.12-3.2 0-5.91-2.16-6.87-5.06H1.23v3.06C3.21 21.3 7.37 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.13 14.19c-.25-.76-.39-1.57-.39-2.41 0-.84.14-1.65.39-2.41V6.31H1.23C.44 7.89 0 9.68 0 11.6c0 1.92.44 3.71 1.23 5.29l3.9-3.06z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.21 2.7 1.23 6.31l3.9 3.06c.96-2.9 3.67-5.06 6.87-5.06z"
              />
            </svg>
            {loading ? "Redirecting..." : "Continue with Google"}
          </Button>

          {/* Guest Mode Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink/8 border-dashed"></div>
            </div>
            <span className="relative bg-white/70 px-3 text-[11px] font-medium uppercase tracking-wider text-ink-soft">
              Explore the system
            </span>
          </div>

          {/* Continue as Guest */}
          <Button
            type="button"
            block
            variant="secondary"
            onClick={() => navigate("/app/mentor")}
            className="flex justify-center items-center gap-2 border border-azure-200 bg-azure-200/20 hover:bg-azure-200/40 text-azure-600 transition-colors h-11"
          >
            <Sparkles size={16} className="text-azure-500 animate-pulse" />
            Continue as Guest (Demo Mode)
            <ArrowRight size={15} />
          </Button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/50 bg-snow/70 py-6 text-center text-caption text-ink-soft backdrop-blur-md">
        <p>© {new Date().getFullYear()} MentorOS · Dedicated to improving student success outcomes.</p>
      </footer>
    </div>
  );
}
