import { LegalPageLayout } from "@/components/LegalPageLayout";

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed whitespace-normal">{children}</p>
);

export function LegalPrivacy() {
  return (
    <LegalPageLayout
      title="REIT Privacy Policy"
      disclaimer="This Privacy Policy is a template and should be reviewed by legal counsel before being treated as a final legal document."
      sections={[
        {
          title: "1. Introduction",
          content: (
            <P>
              REIT Site Administration is provided by Wolf Consulting Group, LLC. This policy
              explains how information is handled in connection with REIT Site Administration.
            </P>
          ),
        },
        {
          title: "2. Information we may collect",
          content: (
            <>
              <P>Depending on configuration, REIT Site Administration may collect:</P>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Account information (names, email addresses, roles)</li>
                <li>Business data (site records, leases, documents, notes)</li>
                <li>Technical data (log entries, audit events, usage metrics)</li>
              </ul>
              <P>
                Customer organizations are responsible for the data they enter into the application.
              </P>
            </>
          ),
        },
        {
          title: "3. How information is used",
          content: (
            <>
              <P>Information is used to:</P>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Provide and operate the application.</li>
                <li>Support user authentication and authorization.</li>
                <li>Maintain logs and audit trails for security and troubleshooting.</li>
                <li>Improve performance and reliability.</li>
              </ul>
            </>
          ),
        },
        {
          title: "4. Data sharing",
          content: (
            <P>
              Wolf Consulting Group does not sell customer data. Information may be shared with
              infrastructure and service providers (hosting, storage, monitoring) as needed to
              operate the service, subject to appropriate safeguards.
            </P>
          ),
        },
        {
          title: "5. Data security",
          content: (
            <P>
              Reasonable technical and organizational measures are used to protect information.
              However, no system can be completely secure, and absolute security cannot be guaranteed.
            </P>
          ),
        },
        {
          title: "6. Data retention",
          content: (
            <P>
              Data is retained as long as needed to provide the service and to comply with legal
              and contractual obligations. Customers may have additional retention settings
              available within the application.
            </P>
          ),
        },
        {
          title: "7. Customer responsibilities",
          content: (
            <>
              <P>Customers are responsible for:</P>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Configuring REIT Site Administration to comply with their own policies.</li>
                <li>Providing appropriate notices and obtaining required consents from end users.</li>
                <li>Handling data export and deletion requests for their own data.</li>
              </ul>
            </>
          ),
        },
        {
          title: "8. Your rights",
          content: (
            <P>
              Depending on your jurisdiction and applicable agreements, you may have rights related
              to access, correction, or deletion of your data. Requests are typically handled between
              the user and their customer organization.
            </P>
          ),
        },
        {
          title: "9. Changes to this Privacy Policy",
          content: (
            <P>
              This Privacy Policy may be updated from time to time. The updated version will be
              posted within REIT Site Administration or on the Wolf Consulting Group website.
            </P>
          ),
        },
        {
          title: "10. Contact",
          content: (
            <P>
              For questions about this Privacy Policy, contact{" "}
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
