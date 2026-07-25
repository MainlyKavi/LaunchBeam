import type { Metadata } from "next";
import Link from "next/link";
import "../legal.css";

export const metadata: Metadata = {
  title: "Terms | LaunchBeam",
  description: "Starter terms for the LaunchBeam waitlist platform.",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <nav className="legal-nav">
        <Link className="brand" href="/" aria-label="LaunchBeam home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-wordmark">LaunchBeam</span>
        </Link>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/login">Login</Link>
        </div>
      </nav>

      <article className="legal-document">
        <header>
          <p>Starter terms · Last updated July 25, 2026</p>
          <h1>Terms</h1>
          <div className="legal-notice">
            These starter terms require professional review and operator-specific
            details before commercial launch. They are not legal advice and do
            not by themselves create a production-ready agreement.
          </div>
        </header>

        <section>
          <h2>1. Product use</h2>
          <p>
            LaunchBeam is a beta tool for creating and publishing waitlists,
            collecting subscriber details, attributing referrals, and reviewing
            early demand signals. You may use the service only in accordance with
            applicable law and these terms.
          </p>
        </section>

        <section>
          <h2>2. Accounts and responsibilities</h2>
          <p>
            You are responsible for accurate account information, safeguarding
            access to your account, activity performed through it, and promptly
            reporting suspected unauthorized use. You must have authority to
            publish the content and assets you upload.
          </p>
        </section>

        <section>
          <h2>3. Subscriber data</h2>
          <p>
            Project owners determine why subscriber data is collected and are
            responsible for an appropriate privacy notice, lawful basis,
            marketing consent where required, honoring data requests, securing
            CSV exports, and using subscriber information only for disclosed
            purposes. Do not upload purchased or unlawfully obtained lists.
          </p>
        </section>

        <section>
          <h2>4. Prohibited content and conduct</h2>
          <p>You may not use LaunchBeam to:</p>
          <ul>
            <li>break laws, infringe rights, deceive, harass, or cause harm;</li>
            <li>publish malware, credential theft, or unsafe executable content;</li>
            <li>send spam or collect sensitive data without proper safeguards;</li>
            <li>bypass access controls, rate limits, or abuse protections;</li>
            <li>probe or disrupt the service beyond authorized testing; or</li>
            <li>impersonate another person, product, or organization.</li>
          </ul>
        </section>

        <section>
          <h2>5. Beta availability</h2>
          <p>
            The beta may change, pause, lose data, or contain defects. Features,
            limits, templates, integrations, and URLs may change. Custom domains,
            billing, team collaboration, and other roadmap features are not
            promised by this codebase. Keep independent copies of important
            subscriber exports and project content.
          </p>
        </section>

        <section>
          <h2>6. Intellectual property</h2>
          <p>
            You retain rights in content and assets you provide and grant the
            operator the limited permission needed to host, process, render, and
            transmit them as part of the service. LaunchBeam, its original
            interface, and its code and branding remain protected by their
            respective licenses and rights.
          </p>
        </section>

        <section>
          <h2>7. Suspension and termination</h2>
          <p>
            The operator may suspend or terminate access to protect the service,
            respond to legal obligations, or address material violations.
            Production terms should add notice, appeal, export, deletion, and
            retention procedures. You may unpublish projects and stop using the
            beta at any time.
          </p>
        </section>

        <section>
          <h2>8. Disclaimers and liability</h2>
          <p>
            To the extent permitted by law, the beta is provided as available
            without warranties of uninterrupted operation, fitness for a
            particular purpose, or guaranteed launch outcomes. Demand Score is a
            transparent directional metric, not financial, investment, or market
            advice. Production counsel must tailor liability limitations,
            exclusions, and remedies to the operator&apos;s jurisdiction.
          </p>
        </section>

        <section>
          <h2>9. Changes and contact</h2>
          <p>
            The operator may update these terms as the product evolves and should
            provide appropriate notice before material production changes. Before
            launch, replace this paragraph with the operator&apos;s legal name,
            address, governing law, dispute process, and monitored contact
            channel.
          </p>
        </section>
      </article>

      <footer className="legal-footer">
        <span>LaunchBeam beta</span>
        <div>
          <Link href="/">Home</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}
