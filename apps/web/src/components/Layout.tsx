import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { Tooltip } from "@/components/ui/Tooltip";
import { PageTransition } from "@/components/PageTransition";
import { PERMISSIONS } from "@/lib/permissions";
import {
  LayoutDashboard,
  FolderKanban,
  Upload,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle,
  Map,
  FileText,
  Receipt,
  Lightbulb,
  RotateCcw,
  Building2,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  group?: string;
}

const MAIN_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban, permission: PERMISSIONS.PROJECTS_READ },
  { to: "/import", label: "Import", icon: Upload, permission: PERMISSIONS.IMPORT_RUN },
  { to: "/admin", label: "Admin", icon: Shield, permission: PERMISSIONS.USERS_READ },
];

function getProjectNav(projectId: string): NavItem[] {
  return [
    { to: `/projects/${projectId}`, label: "Overview", icon: Building2, permission: PERMISSIONS.PROJECTS_READ },
    { to: `/projects/${projectId}/sites`, label: "Sites", icon: LayoutDashboard, permission: PERMISSIONS.SITES_READ },
    { to: `/projects/${projectId}/map`, label: "Map", icon: Map, permission: PERMISSIONS.SITES_READ },
    { to: `/projects/${projectId}/leases`, label: "Leases", icon: Receipt, permission: PERMISSIONS.LEASES_READ },
    { to: `/projects/${projectId}/renewals`, label: "Renewals", icon: RotateCcw, permission: PERMISSIONS.LEASES_READ },
    { to: `/projects/${projectId}/documents`, label: "Documents", icon: FileText, permission: PERMISSIONS.DOCUMENTS_READ },
    { to: `/projects/${projectId}/insights`, label: "Insights", icon: Lightbulb, permission: PERMISSIONS.INSIGHTS_READ },
    { to: `/projects/${projectId}/import`, label: "Import", icon: Upload, permission: PERMISSIONS.IMPORT_RUN },
  ];
}

export function Layout() {
  const { user, logout, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ projectId?: string }>();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const projectMatch = location.pathname.match(/^\/projects\/([a-f0-9]{24})/);
  const activeProjectId = projectMatch?.[1] ?? params.projectId;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const isExactActive = (path: string) => location.pathname === path;

  const filteredMain = MAIN_NAV.filter((n) => !n.permission || hasPermission(n.permission));
  const projectNav = activeProjectId ? getProjectNav(activeProjectId).filter((n) => !n.permission || hasPermission(n.permission)) : [];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <img src="/logo.png" alt="REIT" className={collapsed ? "h-9 w-auto" : "h-10 w-auto"} />
          {!collapsed && <span className="font-semibold text-base text-foreground truncate">REIT Sites</span>}
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {!collapsed && <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Navigation</p>}
        {filteredMain.map((item) => {
          const active = item.to === "/" ? isExactActive("/") : isActive(item.to);
          const link = (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={item.to} content={item.label} side="right">{link}</Tooltip>
          ) : link;
        })}

        {/* Project subnav */}
        {projectNav.length > 0 && (
          <>
            <div className="my-3 border-t border-sidebar-border" />
            {!collapsed && <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Project</p>}
            {projectNav.map((item) => {
              const active = isExactActive(item.to) || (item.to.endsWith("/sites") && location.pathname.match(/\/sites\/[a-f0-9]{24}/));
              const link = (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
              return collapsed ? (
                <Tooltip key={item.to} content={item.label} side="right">{link}</Tooltip>
              ) : link;
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-1 shrink-0">
        {collapsed ? (
          <>
            <Tooltip content={user?.name ?? "Profile"} side="right">
              <Link to="/profile" className="flex items-center justify-center rounded-lg p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <UserCircle className="h-[18px] w-[18px]" />
              </Link>
            </Tooltip>
            <Tooltip content="Log out" side="right">
              <button onClick={handleLogout} className="flex items-center justify-center rounded-lg p-2.5 text-muted-foreground hover:bg-accent hover:text-destructive transition-colors w-full">
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </Tooltip>
          </>
        ) : (
          <>
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <UserCircle className="h-[18px] w-[18px] shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-foreground text-sm font-medium">{user?.name ?? user?.email}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-destructive transition-colors w-full"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span>Log out</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="absolute top-4 right-3">
          <button onClick={() => setMobileOpen(false)} className="p-1 rounded-md hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border shadow-sidebar transition-all duration-200 shrink-0 ${collapsed ? "w-[68px]" : "w-64"}`}>
        {sidebarContent}
        <div className="absolute bottom-20 -right-3 z-10">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center h-6 w-6 rounded-full border bg-card shadow-sm hover:bg-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center h-14 px-4 border-b bg-card lg:hidden shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-md hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-2 ml-3">
            <img src="/logo.png" alt="REIT" className="h-8 w-auto" />
            <span className="font-semibold text-sm">REIT Sites</span>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
