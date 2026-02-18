import { LegalPageLayout } from "@/components/LegalPageLayout";

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed whitespace-normal">{children}</p>
);

export function LegalEula() {
  return (
    <LegalPageLayout
      title="REIT End User License Agreement (EULA)"
      disclaimer="This End User License Agreement is a template and is provided for general informational purposes. It should be reviewed by legal counsel before being treated as a final legal document."
      sections={[
        {
          title: "1. License grant",
          content: (
            <P>
              Wolf Consulting Group, LLC grants you a limited, non-exclusive, non-transferable,
              non-sublicensable license to access and use REIT Site Administration solely for
              internal business purposes, subject to the terms and conditions of this Agreement.
            </P>
          ),
        },
        {
          title: "2. Ownership",
          content: (
            <P>
              REIT Site Administration, including all software, code, interfaces, visual elements,
              workflows, and documentation, is owned by Wolf Consulting Group, LLC and is protected
              by copyright and intellectual property laws. You receive a license to use the
              application, not ownership of it.
            </P>
          ),
        },
        {
          title: "3. Restrictions",
          content: (
            <>
              <P>You agree not to:</P>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Copy, modify, or create derivative works except as expressly permitted in writing.</li>
                <li>Reverse engineer, decompile, or extract source code except as permitted by applicable law.</li>
                <li>Rent, lease, sell, sublicense, or transfer access to any third party.</li>
                <li>Use REIT Site Administration in violation of any applicable law or regulation.</li>
              </ul>
            </>
          ),
        },
        {
          title: "4. User data and access",
          content: (
            <P>
              You are responsible for maintaining the confidentiality of your credentials and for
              all activity that occurs under your account. You are responsible for the accuracy
              of data you enter into the application.
            </P>
          ),
        },
        {
          title: "5. Updates and changes",
          content: (
            <P>
              Wolf Consulting Group may update, enhance, or modify REIT Site Administration at any
              time. Some updates may be applied automatically. Your continued use of the application
              after an update constitutes acceptance of the updated version.
            </P>
          ),
        },
        {
          title: "6. Term and termination",
          content: (
            <P>
              This Agreement remains in effect while you have authorized access to REIT Site
              Administration. Wolf Consulting Group may suspend or terminate your access if you
              violate this Agreement. Upon termination, your license ends and you must stop
              using the application.
            </P>
          ),
        },
        {
          title: "7. No warranty",
          content: (
            <P>
              REIT Site Administration is provided "as is" and "as available." Wolf Consulting Group
              disclaims all warranties, including warranties of merchantability, fitness for a
              particular purpose, and non-infringement.
            </P>
          ),
        },
        {
          title: "8. Limitation of liability",
          content: (
            <P>
              Wolf Consulting Group shall not be liable for any indirect, incidental, consequential,
              special, or punitive damages arising from your use of REIT Site Administration. Total
              liability shall not exceed the amount paid for access in the preceding 12 months.
            </P>
          ),
        },
        {
          title: "9. Governing law",
          content: (
            <P>
              This Agreement is governed by the laws of the State of North Carolina, United States,
              without regard to conflict of law principles.
            </P>
          ),
        },
        {
          title: "10. Contact",
          content: (
            <P>
              For questions about this Agreement, contact{" "}
              <a href="mailto:contactwcg@wolfconsultingnc.com" className="text-primary hover:underline">
                contactwcg@wolfconsultingnc.com
              </a>.
            </P>
          ),
        },
      ]}
    />
  );
}
