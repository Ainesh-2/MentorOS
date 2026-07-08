import { create } from "zustand";
import type { Role } from "@/types";
import type { User, Session } from "@supabase/supabase-js";

/**
 * Light global UI state. Centralizes auth session and role routing state.
 */
interface AppState {
  activeRole: Role;
  setActiveRole: (role: Role) => void;

  /** Mobile sidebar drawer. */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  /** Floating AI Companion panel (available on the student dashboard). */
  companionOpen: boolean;
  setCompanionOpen: (open: boolean) => void;
  toggleCompanion: () => void;

  /** Supabase Auth state */
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  setSession: (session: Session | null, user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeRole: "mentor",
  setActiveRole: (activeRole) => set({ activeRole, sidebarOpen: false }),

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  companionOpen: false,
  setCompanionOpen: (companionOpen) => set({ companionOpen }),
  toggleCompanion: () => set((s) => ({ companionOpen: !s.companionOpen })),

  user: null,
  session: null,
  authLoading: true,
  setSession: (session, user) => set({ session, user }),
  setAuthLoading: (authLoading) => set({ authLoading }),
}));
