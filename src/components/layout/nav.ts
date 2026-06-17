import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  FileDown,
  Grid3x3,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  Users2,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Route to navigate to (the role's home). */
  to: string;
  /** Optional in-page section to smooth-scroll to. */
  anchor?: string;
  /** Special UI action instead of navigation. */
  action?: "companion";
}

export const NAV: Record<Role, NavItem[]> = {
  student: [
    { label: "Overview", icon: LayoutDashboard, to: "/app/student", anchor: "overview" },
    { label: "My meetings", icon: CalendarDays, to: "/app/student", anchor: "meetings" },
    { label: "Privacy & consent", icon: ShieldCheck, to: "/app/student", anchor: "consent" },
    { label: "AI Companion", icon: Sparkles, to: "/app/student", action: "companion" },
  ],
  mentor: [
    { label: "Mentee roster", icon: Users, to: "/app/mentor", anchor: "roster" },
    { label: "Upcoming meetings", icon: CalendarDays, to: "/app/mentor", anchor: "meetings" },
  ],
  hod: [
    { label: "Overview", icon: LayoutDashboard, to: "/app/hod", anchor: "overview" },
    { label: "Risk heatmap", icon: Grid3x3, to: "/app/hod", anchor: "heatmap" },
    { label: "Mentor workload", icon: Users2, to: "/app/hod", anchor: "workload" },
    { label: "Semester trend", icon: TrendingUp, to: "/app/hod", anchor: "trend" },
  ],
  admin: [
    { label: "Users", icon: Users, to: "/app/admin", anchor: "users" },
    { label: "Data import", icon: Upload, to: "/app/admin", anchor: "import" },
    { label: "Compliance exports", icon: FileDown, to: "/app/admin", anchor: "exports" },
  ],
};
