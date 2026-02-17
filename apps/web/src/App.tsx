import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Sites } from "@/pages/Sites";
import { SiteDetail } from "@/pages/SiteDetail";
import { SiteForm } from "@/pages/SiteForm";
import { ImportPage } from "@/pages/Import";
import { Admin } from "@/pages/Admin";
import { PERMISSIONS } from "@/lib/permissions";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1 },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequirePermission({ permission, children }: { permission: string; children: React.ReactNode }) {
  const hasPermission = useAuthStore((s) => s.hasPermission(permission));
  if (!hasPermission) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthLoader({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (!token) return;
    api<{ id: string; email: string; name: string; permissions: string[]; roles: { id: string; name: string }[] }>("/api/auth/me")
      .then((me) => setUser({ id: me.id, email: me.email, name: me.name, permissions: me.permissions, roles: me.roles }))
      .catch(() => {});
  }, [token, setUser]);

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthLoader>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="sites" element={<RequirePermission permission={PERMISSIONS.SITES_READ}><Sites /></RequirePermission>} />
              <Route path="sites/new" element={<RequirePermission permission={PERMISSIONS.SITES_WRITE}><SiteForm /></RequirePermission>} />
              <Route path="sites/:id" element={<RequirePermission permission={PERMISSIONS.SITES_READ}><SiteDetail /></RequirePermission>} />
              <Route path="sites/:id/edit" element={<RequirePermission permission={PERMISSIONS.SITES_WRITE}><SiteForm /></RequirePermission>} />
              <Route path="import" element={<RequirePermission permission={PERMISSIONS.IMPORT_RUN}><ImportPage /></RequirePermission>} />
              <Route path="admin" element={<RequirePermission permission={PERMISSIONS.USERS_READ}><Admin /></RequirePermission>} />
              <Route path="admin/*" element={<RequirePermission permission={PERMISSIONS.USERS_READ}><Admin /></RequirePermission>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthLoader>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
