import { Routes, Route, NavLink } from "react-router-dom";
import { Users } from "@/pages/admin/Users";
import { Roles } from "@/pages/admin/Roles";
import { AuditLog } from "@/pages/admin/AuditLog";
import { Backups } from "@/pages/admin/Backups";
import { Settings } from "@/pages/admin/Settings";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import {
  Users2, ShieldCheck, ScrollText, Database, Cog,
} from "lucide-react";

const TABS = [
  { to: "users", label: "Users", icon: Users2, permission: PERMISSIONS.USERS_READ },
  { to: "roles", label: "Roles", icon: ShieldCheck, permission: PERMISSIONS.ROLES_READ },
  { to: "audit", label: "Audit Logs", icon: ScrollText, permission: PERMISSIONS.AUDIT_READ },
  { to: "backups", label: "Backups", icon: Database, permission: PERMISSIONS.BACKUPS_MANAGE },
  { to: "settings", label: "Settings", icon: Cog, permission: PERMISSIONS.BACKUPS_MANAGE },
];

export function Admin() {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
      <nav className="flex gap-1 border-b">
        {TABS.filter((t) => hasPermission(t.permission)).map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "users"}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route path="users" element={<Users />} />
        <Route path="roles" element={<Roles />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="backups" element={<Backups />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </div>
  );
}
