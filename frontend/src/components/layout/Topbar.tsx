import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Menu, Sparkles } from "lucide-react";
import type { Role } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { ROLE_HOME, ROLE_TITLE, resolveIdentity } from "@/api/session";
import { Avatar, Button } from "@/components/primitives";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const ROLE_ORDER: Role[] = ["student", "mentor", "hod", "admin"];

const ROLE_BLURB: Record<Role, string> = {
  student: "See your own Success Score",
  mentor: "Roster, meetings & logs",
  hod: "Department-wide risk view",
  admin: "Users, imports & exports",
};

function RoleSwitcher() {
  const navigate = useNavigate();
  const { activeRole, setActiveRole } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const identity = resolveIdentity(activeRole);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(role: Role) {
    setActiveRole(role);
    setOpen(false);
    navigate(ROLE_HOME[role]);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-ink/8 bg-white/70 py-1.5 pl-1.5 pr-3 transition-colors hover:bg-white"
      >
        <Avatar name={identity.name} hue={identity.hue} size="sm" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-caption font-medium text-ink">{identity.name}</span>
          <span className="block text-[11px] text-ink-soft">{identity.sublabel}</span>
        </span>
        <ChevronDown size={16} className={cn("text-ink-soft transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="glass-quiet absolute right-0 z-30 mt-2 w-72 origin-top-right animate-fade-up p-2"
        >
          <p className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">
            Viewing as — switch role
          </p>
          {ROLE_ORDER.map((role) => {
            const id = resolveIdentity(role);
            const active = role === activeRole;
            return (
              <button
                key={role}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(role)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors",
                  active ? "bg-azure-200/45" : "hover:bg-ink/4",
                )}
              >
                <Avatar name={id.name} hue={id.hue} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-caption font-medium text-ink">{ROLE_TITLE[role]}</span>
                    <span className="truncate text-[11px] text-ink-soft">· {id.name}</span>
                  </span>
                  <span className="block truncate text-[11px] text-ink-soft">{ROLE_BLURB[role]}</span>
                </span>
                {active && <Check size={16} className="shrink-0 text-azure-600" />}
              </button>
            );
          })}
          <p className="px-2 pb-1 pt-2 text-[11px] text-ink-soft/80">
            Demo only — no login required.
          </p>
        </div>
      )}
    </div>
  );
}

export function Topbar({ role, title }: { role: Role; title: string }) {
  const { setSidebarOpen, activeRole, toggleCompanion } = useAppStore();
  const [signedIn, setSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Supabase session load error", error);
      }
      if (data?.session?.user?.email) {
        setSignedIn(true);
        setUserEmail(data.session.user.email);
      } else {
        setSignedIn(false);
        setUserEmail(null);
      }
    }

    loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setSignedIn(true);
        setUserEmail(session.user.email);
      } else {
        setSignedIn(false);
        setUserEmail(null);
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("token");
    setSignedIn(false);
    setUserEmail(null);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink/8 bg-snow/70 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
        className="rounded-sm p-2 text-ink-soft hover:bg-ink/4 lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[20px] font-semibold leading-tight text-ink">
          {title}
        </h1>
        <p className="hidden text-[11px] text-ink-soft sm:block">{ROLE_TITLE[role]} workspace</p>
      </div>

      {activeRole === "student" && (
        <button
          type="button"
          onClick={toggleCompanion}
          className="hidden items-center gap-2 rounded-full border border-azure-200 bg-azure-200/40 px-3 py-2 text-caption font-medium text-azure-600 transition-colors hover:bg-azure-200/70 sm:flex"
        >
          <Sparkles size={16} />
          AI Companion
        </button>
      )}

      <div className="hidden items-center gap-3 rounded-full border border-ink/10 bg-white/75 px-3 py-2 text-caption text-ink-soft sm:flex">
        {signedIn ? (
          <>
            <span className="truncate">Signed in as {userEmail}</span>
            <Button size="sm" variant="secondary" onClick={handleSignOut}>
              Sign out
            </Button>
          </>
        ) : (
          <span>Not signed in</span>
        )}
      </div>

      <RoleSwitcher />
    </header>
  );
}
