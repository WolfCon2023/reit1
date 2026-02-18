import { Link } from "react-router-dom";

export function About() {
  return (
    <div className="min-h-screen flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-4xl rounded-2xl bg-card border p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">About REIT Site Administration</h1>
          <Link
            to="/"
            className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors shrink-0"
          >
            Back to Home
          </Link>
        </div>

        {/* Description */}
        <section className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            REIT Site Administration is an integrated site management platform designed by Wolf Consulting Group, LLC.
            REIT gives real estate investment trust operators and tower portfolio managers a modern workspace for
            site management, lease tracking, document compliance, revenue analytics, and administrative workflows.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            REIT Site Administration is built to simplify portfolio operations with a flexible, scalable, and secure
            architecture. It brings together multiple management modules into a unified platform designed for
            efficiency, clarity, and productivity.
          </p>
        </section>

        {/* What REIT helps manage */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What REIT helps you manage</h2>
          <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
            <li>Tower and cell site portfolios</li>
            <li>Lease tracking and renewal workflows</li>
            <li>Revenue analytics and reporting</li>
            <li>Document and compliance management</li>
            <li>Geospatial site mapping and analysis</li>
            <li>Data quality insights and deduplication</li>
            <li>User and role management</li>
          </ul>
        </section>

        {/* Ownership */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Ownership and copyright</h2>
          <p className="text-sm text-muted-foreground">
            REIT Site Administration is created and owned by Wolf Consulting Group, LLC.
          </p>
          <p className="text-sm text-muted-foreground">
            Copyright &copy; {new Date().getFullYear()} Wolf Consulting Group, LLC. All Rights Reserved.
          </p>
          <div className="rounded-2xl border bg-muted/30 p-4 text-sm space-y-1 text-muted-foreground">
            <p><span className="font-medium text-foreground">Registered Work:</span> REIT Site Administration</p>
            <p><span className="font-medium text-foreground">Claimant and Owner:</span> Wolf Consulting Group, LLC</p>
            <p>
              <span className="font-medium text-foreground">Website:</span>{" "}
              <a href="https://www.wolfconsultingnc.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://www.wolfconsultingnc.com
              </a>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            This software and all related materials are protected by United States copyright law. No part of
            this application may be reproduced, distributed, modified, or transmitted in any form without prior
            written permission from Wolf Consulting Group, LLC.
          </p>
        </section>

        {/* Trademarks */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Trademarks</h2>
          <p className="text-sm text-muted-foreground">
            REIT Site Administration and the Wolf Consulting Group logo are trademarks or service marks of
            Wolf Consulting Group, LLC.
          </p>
        </section>

        {/* Technology */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Technology</h2>
          <p className="text-sm text-muted-foreground">
            REIT Site Administration is built with a modern web stack that supports secure, scalable,
            and maintainable operations.
          </p>
          <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
            <li>React for the frontend user interface</li>
            <li>Node.js and Express for backend APIs</li>
            <li>MongoDB for data storage</li>
            <li>Railway and Cloudflare for hosting, routing, and infrastructure services</li>
          </ul>
        </section>

        {/* Contact */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Contact and support</h2>
          <div className="max-w-md rounded-2xl border bg-muted/30 p-4 text-sm space-y-1 text-muted-foreground">
            <p className="font-semibold text-foreground whitespace-nowrap">Wolf Consulting Group, LLC</p>
            <p>
              Email:{" "}
              <a href="mailto:support@wolfconsultingnc.com" className="text-primary hover:underline">
                support@wolfconsultingnc.com
              </a>
            </p>
            <p>
              Website:{" "}
              <a href="https://www.wolfconsultingnc.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://www.wolfconsultingnc.com
              </a>
            </p>
          </div>
        </section>

        {/* Legal links */}
        <section className="space-y-3 border-t pt-6">
          <h2 className="text-lg font-semibold">Legal</h2>
          <p className="text-sm text-muted-foreground">
            The following documents describe important legal terms for using REIT Site Administration.
            They are provided as templates and should be reviewed by legal counsel before being treated
            as final legal documents.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/legal/eula" className="rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors">
              End User License Agreement (EULA)
            </Link>
            <Link to="/legal/terms" className="rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors">
              Terms of Service
            </Link>
            <Link to="/legal/privacy" className="rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors">
              Privacy Policy
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
