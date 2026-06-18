import { create } from "zustand";
import type { Role } from "@/types";

/**
 * Light global UI state. This is *not* auth — the role switcher in the topbar
 * just swaps which mock identity is "active" so a single demo can walk through
 * all four dashboards. Real auth would replace `activeRole` with a session.
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
}

export const useAppStore = create<AppState>((set) => ({
  activeRole: "mentor",
  setActiveRole: (activeRole) => set({ activeRole, sidebarOpen: false }),

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  companionOpen: false,
  setCompanionOpen: (companionOpen) => set({ companionOpen }),
  toggleCompanion: () => set((s) => ({ companionOpen: !s.companionOpen })),
}));
