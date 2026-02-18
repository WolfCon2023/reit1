import { Link } from "react-router-dom";

const FOOTER_LINKS = [
  { label: "About", to: "/about" },
  { label: "EULA", to: "/legal/eula" },
  { label: "Terms", to: "/legal/terms" },
  { label: "Privacy", to: "/legal/privacy" },
];

export function AppFooter() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          &copy; {new Date().getFullYear()} Wolf Consulting Group, LLC. REIT Site Administration. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {FOOTER_LINKS.map((link, i) => (
            <span key={link.to} className="flex items-center gap-3">
              {i > 0 && <span className="text-border">|</span>}
              <Link
                to={link.to}
                className="text-xs text-muted-foreground no-underline hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
