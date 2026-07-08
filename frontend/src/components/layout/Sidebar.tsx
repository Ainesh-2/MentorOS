import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, X } from "lucide-react";
import type { Role } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { ROLE_TITLE } from "@/api/session";
import { Brand } from "@/components/Brand";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

function NavList({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toggleCompanion = useAppStore((s) => s.toggleCompanion);
  // Track the active anchor by hash; default to the first item on each page.
  const activeHash = location.hash.replace("#", "");

  return (
    <nav className="flex flex-col gap-1" aria-label={`${ROLE_TITLE[role]} navigation`}>
      {NAV[role].map((item, i) => {
        const Icon = item.icon;
        const isActive = item.action
          ? false
          : activeHash
            ? activeHash === item.anchor
            : i === 0;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              if (item.action === "companion") {
                toggleCompanion();
              } else {
                if (location.pathname !== item.to) navigate(item.to);
                if (item.anchor) {
                  // Defer so the target exists after any route change.
                  window.setTimeout(() => {
                    const el = document.getElementById(item.anchor!);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    history.replaceState(null, "", `#${item.anchor}`);
                  }, 60);
                }
              }
              onNavigate?.();
            }}
            className={cn(
              "group flex items-center gap-3 rounded-sm px-3 py-2.5 text-left text-body transition-colors",
              isActive
                ? "bg-azure-200/55 font-medium text-azure-600"
                : "text-ink-soft hover:bg-ink/4 hover:text-ink",
            )}
          >
            <Icon
              size={18}
              className={cn("shrink-0", isActive ? "text-azure-600" : "text-ink-soft group-hover:text-ink")}
            />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function SidebarBody({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { session, user } = useAppStore();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out failed", error);
    }
    useAppStore.getState().setSession(null, null);
    sessionStorage.removeItem("token");
    localStorage.removeItem("sb-ozkqklyzjmlahlwehdmd-auth-token");
    navigate("/auth/login", { replace: true });
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <button
        type="button"
        onClick={() => {
          navigate("/");
          onNavigate?.();
        }}
        className="w-fit rounded-sm focus-visible:outline-2 focus-visible:outline-azure-500"
        aria-label="MentorOS home"
      >
        <Brand />
      </button>

      <div className="text-caption font-medium uppercase tracking-wide text-ink-soft/70">
        {ROLE_TITLE[role]} workspace
      </div>

      <NavList role={role} onNavigate={onNavigate} />

      <div className="mt-auto space-y-4">
        {session && user && (
          <div className="border-t border-ink/8 pt-4">
            <div className="px-3 pb-2">
              <p className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold">Logged In As</p>
              <p className="truncate text-caption text-ink font-medium" title={user.email}>{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-caption text-signal-coral hover:bg-signal-coral/10 transition-colors"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            navigate("/");
            onNavigate?.();
          }}
          className="flex items-center gap-2 rounded-sm px-3 py-2 text-caption text-ink-soft transition-colors hover:bg-ink/4 hover:text-ink w-full"
        >
          <ArrowLeft size={15} />
          Back to landing page
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ role }: { role: Role }) {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <>
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-ink/8 bg-white/55 backdrop-blur-md lg:block">
        <SidebarBody role={role} />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-72 animate-fade-up bg-snow shadow-glass-strong">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 rounded-sm p-1.5 text-ink-soft hover:bg-ink/4"
            >
              <X size={20} />
            </button>
            <SidebarBody role={role} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
