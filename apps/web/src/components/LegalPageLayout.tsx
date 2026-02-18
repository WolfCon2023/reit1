import { useNavigate, Link } from "react-router-dom";

interface LegalSection {
  title: string;
  content: React.ReactNode;
}

interface LegalPageLayoutProps {
  title: string;
  disclaimer: string;
  sections: LegalSection[];
}

export function LegalPageLayout({ title, disclaimer, sections }: LegalPageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-4xl rounded-2xl bg-card border p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            <Link
              to="/"
              className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <header>
          <p className="text-sm leading-relaxed text-muted-foreground">{disclaimer}</p>
        </header>

        {/* Collapsible sections */}
        <section className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 legal-page-body">
          {sections.map((section, i) => (
            <details key={i} className="group rounded-lg bg-muted/30 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
                <span>{section.title}</span>
                <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">&#x2303;</span>
              </summary>
              <div className="mt-2 space-y-2">
                {section.content}
              </div>
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}
