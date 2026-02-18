import { LegalPageLayout } from "@/components/LegalPageLayout";

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed whitespace-normal">{children}</p>
);

export function LegalTerms() {
  return (
    <LegalPageLayout
      title="REIT Terms of Service"
      disclaimer="These Terms of Service are a template and should be reviewed by legal counsel before being treated as a final legal document."
      sections={[
        {
          title: "1. Acceptance of terms",
          content: (
            <P>
              By accessing or using REIT Site Administration, you agree to be bound by these
              Terms of Service. If you do not agree, you must not use the service.
            </P>
          ),
        },
        {
          title: "2. Use of the service",
          content: (
            <P>
              REIT Site Administration is provided for business use by customers of Wolf Consulting
              Group, LLC. You agree to use the service only for lawful purposes and in accordance
              with any applicable agreements between you and Wolf Consulting Group.
            </P>
          ),
        },
        {
          title: "3. Accounts and security",
          content: (
            <P>
              You are responsible for keeping your login credentials secure and for all actions
              taken using your account. You must notify Wolf Consulting Group immediately if you
              suspect any unauthorized access to your account.
            </P>
          ),
        },
        {
          title: "4. Service availability",
          content: (
            <P>
              REIT Site Administration may be unavailable from time to time due to maintenance,
              upgrades, or events beyond our control. Wolf Consulting Group is not responsible for
              any downtime or temporary inaccessibility of data.
            </P>
          ),
        },
        {
          title: "5. Data and privacy",
          content: (
            <P>
              Your use of REIT Site Administration is also governed by the REIT Privacy Policy.
              You must ensure that your use of the service in connection with customer or employee
              data complies with applicable privacy laws.
            </P>
          ),
        },
        {
          title: "6. Prohibited activities",
          content: (
            <>
              <P>You must not:</P>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Attempt to interfere with the security or integrity of REIT Site Administration.</li>
                <li>Use the service to distribute malware, spam, or illegal content.</li>
                <li>Access or attempt to access other users' data without authorization.</li>
              </ul>
            </>
          ),
        },
        {
          title: "7. Modifications to the service or terms",
          content: (
            <P>
              Wolf Consulting Group may modify REIT Site Administration or these Terms of Service
              at any time. Your continued use of the service after changes have been made
              constitutes your agreement to the updated Terms.
            </P>
          ),
        },
        {
          title: "8. Termination",
          content: (
            <P>
              Wolf Consulting Group may suspend or terminate your access to the service if you
              violate these Terms or under the provisions of a separate agreement.
            </P>
          ),
        },
        {
          title: "9. Disclaimers and limitation of liability",
          content: (
            <P>
              REIT Site Administration is provided "as is" and "as available" without warranties
              of any kind. Wolf Consulting Group shall not be liable for any indirect or
              consequential damages. Total liability is limited as described in the EULA.
            </P>
          ),
        },
        {
          title: "10. Contact",
          content: (
            <P>
              For questions about these Terms, contact{" "}
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
