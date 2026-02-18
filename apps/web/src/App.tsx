import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useFeaturesStore } from "@/store/features";
import { api } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Sites } from "@/pages/Sites";
import { SiteDetail } from "@/pages/SiteDetail";
import { SiteForm } from "@/pages/SiteForm";
import { ImportPage } from "@/pages/Import";
import { Admin } from "@/pages/Admin";
import { Projects } from "@/pages/Projects";
import { ProjectDashboard } from "@/pages/ProjectDashboard";
import { ProjectSites } from "@/pages/ProjectSites";
import { ProjectSiteDetail } from "@/pages/ProjectSiteDetail";
import { ProjectSiteForm } from "@/pages/ProjectSiteForm";
import { ProjectMap } from "@/pages/ProjectMap";
import { ProjectLeases } from "@/pages/ProjectLeases";
import { ProjectLeaseForm } from "@/pages/ProjectLeaseForm";
import { ProjectDocuments } from "@/pages/ProjectDocuments";
import { ProjectInsights } from "@/pages/ProjectInsights";
import { Profile } from "@/pages/Profile";
import { ProjectRenewals } from "@/pages/ProjectRenewals";
import { About } from "@/pages/About";
import { LegalEula } from "@/pages/legal/Eula";
import { LegalTerms } from "@/pages/legal/Terms";
import { LegalPrivacy } from "@/pages/legal/Privacy";
import { PublicShell } from "@/components/PublicShell";
import { PERMISSIONS } from "@/lib/permissions";
import { Toaster } from "sonner";

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
  const loadFlags = useFeaturesStore((s) => s.loadFlags);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

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
      <Toaster position="top-right" richColors closeButton />
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

              {/* Projects */}
              <Route path="projects" element={<RequirePermission permission={PERMISSIONS.PROJECTS_READ}><Projects /></RequirePermission>} />
              <Route path="projects/:projectId" element={<RequirePermission permission={PERMISSIONS.PROJECTS_READ}><ProjectDashboard /></RequirePermission>} />
              <Route path="projects/:projectId/sites" element={<RequirePermission permission={PERMISSIONS.SITES_READ}><ProjectSites /></RequirePermission>} />
              <Route path="projects/:projectId/sites/new" element={<RequirePermission permission={PERMISSIONS.SITES_WRITE}><ProjectSiteForm /></RequirePermission>} />
              <Route path="projects/:projectId/sites/:id" element={<RequirePermission permission={PERMISSIONS.SITES_READ}><ProjectSiteDetail /></RequirePermission>} />
              <Route path="projects/:projectId/sites/:id/edit" element={<RequirePermission permission={PERMISSIONS.SITES_WRITE}><ProjectSiteForm /></RequirePermission>} />
              <Route path="projects/:projectId/map" element={<RequirePermission permission={PERMISSIONS.SITES_READ}><ProjectMap /></RequirePermission>} />
              <Route path="projects/:projectId/leases" element={<RequirePermission permission={PERMISSIONS.LEASES_READ}><ProjectLeases /></RequirePermission>} />
              <Route path="projects/:projectId/leases/new" element={<RequirePermission permission={PERMISSIONS.LEASES_WRITE}><ProjectLeaseForm /></RequirePermission>} />
              <Route path="projects/:projectId/leases/:leaseId/edit" element={<RequirePermission permission={PERMISSIONS.LEASES_WRITE}><ProjectLeaseForm /></RequirePermission>} />
              <Route path="projects/:projectId/documents" element={<RequirePermission permission={PERMISSIONS.DOCUMENTS_READ}><ProjectDocuments /></RequirePermission>} />
              <Route path="projects/:projectId/insights" element={<RequirePermission permission={PERMISSIONS.INSIGHTS_READ}><ProjectInsights /></RequirePermission>} />
              <Route path="projects/:projectId/renewals" element={<RequirePermission permission={PERMISSIONS.LEASES_READ}><ProjectRenewals /></RequirePermission>} />
              <Route path="projects/:projectId/import" element={<RequirePermission permission={PERMISSIONS.IMPORT_RUN}><ImportPage /></RequirePermission>} />

              {/* Legacy flat routes (kept for backward compat) */}
              <Route path="sites" element={<RequirePermission permission={PERMISSIONS.SITES_READ}><Sites /></RequirePermission>} />
              <Route path="sites/new" element={<RequirePermission permission={PERMISSIONS.SITES_WRITE}><SiteForm /></RequirePermission>} />
              <Route path="sites/:id" element={<RequirePermission permission={PERMISSIONS.SITES_READ}><SiteDetail /></RequirePermission>} />
              <Route path="sites/:id/edit" element={<RequirePermission permission={PERMISSIONS.SITES_WRITE}><SiteForm /></RequirePermission>} />

              <Route path="profile" element={<Profile />} />
              <Route path="import" element={<RequirePermission permission={PERMISSIONS.IMPORT_RUN}><ImportPage /></RequirePermission>} />
              <Route path="admin" element={<RequirePermission permission={PERMISSIONS.USERS_READ}><Admin /></RequirePermission>} />
              <Route path="admin/*" element={<RequirePermission permission={PERMISSIONS.USERS_READ}><Admin /></RequirePermission>} />
            </Route>
            {/* Public pages (no auth required) */}
            <Route element={<PublicShell />}>
              <Route path="/about" element={<About />} />
              <Route path="/legal/eula" element={<LegalEula />} />
              <Route path="/legal/terms" element={<LegalTerms />} />
              <Route path="/legal/privacy" element={<LegalPrivacy />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthLoader>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
