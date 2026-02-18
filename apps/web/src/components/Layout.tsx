import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { PERMISSIONS } from "@/lib/permissions";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/sites", label: "Sites", permission: PERMISSIONS.SITES_READ },
  { to: "/import", label: "Import", permission: PERMISSIONS.IMPORT_RUN },
  { to: "/admin", label: "Admin", permission: PERMISSIONS.USERS_READ },
];

export function Layout() {
  const { user, logout, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <nav className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-semibold text-lg text-primary">
              <img src="/logo.png" alt="REIT Sites" className="h-8 w-auto" />
              REIT Sites
            </Link>
            {NAV.filter((n) => !n.permission || hasPermission(n.permission)).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name || user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6 px-4">
        <Outlet />
      </main>
    </div>
  );
}
