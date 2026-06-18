import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import type { PlatformUser, Role } from "@/types";
import { ROLE_LABEL } from "@/api";
import { Avatar, Badge, EmptyState } from "@/components/primitives";
import { daysAgoLabel, cn } from "@/lib/utils";

type RoleFilter = "all" | Role;

const STATUS_TONE = {
  active: "green",
  invited: "azure",
  suspended: "coral",
} as const;

export function UserTable({ users }: { users: PlatformUser[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");

  const filters: Array<{ key: RoleFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "student", label: "Students" },
    { key: "mentor", label: "Mentors" },
    { key: "hod", label: "HODs" },
    { key: "admin", label: "Admins" },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== "all" && u.role !== role) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, query, role]);

  return (
    <div className="glass-quiet overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ink/8 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people by name or email"
            aria-label="Search users"
            className="h-10 w-full rounded-sm border border-ink/8 bg-white/70 pl-9 pr-3 text-body text-ink placeholder:text-ink-soft/60 focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-200"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setRole(f.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-caption transition-colors",
                role === f.key
                  ? "border-azure-500 bg-azure-200/60 font-medium text-azure-600"
                  : "border-ink/8 bg-white/60 text-ink-soft hover:text-ink",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="No people match"
          body="Try a different search term or role filter."
        />
      ) : (
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="sticky top-0 z-10 bg-snow/85 backdrop-blur">
              <tr className="border-b border-ink/8 text-left text-caption font-semibold uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-2.5">Person</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="hidden px-3 py-2.5 sm:table-cell">Dept</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="hidden px-3 py-2.5 md:table-cell">Last active</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id} className="border-b border-ink/8 transition-colors hover:bg-azure-200/20">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-body text-ink">{u.name}</div>
                        <div className="truncate text-caption text-ink-soft">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={u.role === "admin" || u.role === "hod" ? "azure" : "neutral"}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </td>
                  <td className="hidden px-3 py-2.5 text-caption text-ink-soft sm:table-cell">
                    {u.department_code}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={STATUS_TONE[u.status]} dot>
                      <span className="capitalize">{u.status}</span>
                    </Badge>
                  </td>
                  <td className="hidden px-3 py-2.5 text-caption text-ink-soft md:table-cell">
                    {daysAgoLabel(u.last_active)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
