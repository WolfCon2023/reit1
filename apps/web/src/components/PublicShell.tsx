import { Outlet } from "react-router-dom";
import { AppFooter } from "./AppFooter";

export function PublicShell() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-4 print:hidden">
        <AppFooter />
      </footer>
    </div>
  );
}
