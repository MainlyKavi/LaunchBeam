import type { Metadata } from "next";
import Link from "next/link";
import "../legal.css";

export const metadata: Metadata = {
  title: "Privacy | LaunchBeam",
  description:
    "Starter privacy notice for the LaunchBeam waitlist platform.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <nav className="legal-nav">
        <Link className="brand" href="/" aria-label="LaunchBeam home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-wordmark">LaunchBeam</span>
        </Link>
        <div>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Login</Link>
        </div>
      </nav>

      <article className="legal-document">
        <header>
          <p>Starter policy · Last updated July 25, 2026</p>
          <h1>Privacy</h1>
          <div className="legal-notice">
            This is a starter policy for the LaunchBeam beta. It must be reviewed
            by a qualified professional and updated to match the operator&apos;s
            real practices before commercial launch. It is not legal advice.
          </div>
        </header>

        <section>
          <h2>1. What LaunchBeam processes</h2>
          <p>
            Account holders provide an email address and authentication
            credentials to Supabase Auth. Project owners add project content,
            visual settings, publication choices, and optional images. Passwords
            are handled by Supabase Auth and are not stored in LaunchBeam
            application tables.
          </p>
          <p>
            People joining a public waitlist provide an email address and,
            depending on the project, may provide a name and one custom answer.
            LaunchBeam stores their waitlist status, position, referral code,
            referral relationship, campaign parameters, and timestamps.
          </p>
        </section>

        <section>
          <h2>2. Analytics and referrals</h2>
          <p>
            Published waitlists record page views, signups, referral visits,
            referral signups, and share clicks. Events may include a random
            first-party session identifier, referring URL, normalized device
            category, deployment-provided country code, and UTM campaign values.
            LaunchBeam does not create browser fingerprints or permanently store
            raw IP addresses in its application database.
          </p>
          <p>
            A project-specific referral cookie may remember a valid referral for
            up to 30 days. Authentication cookies keep account holders signed in.
            These cookies are used for security, sessions, and attribution rather
            than cross-site advertising.
          </p>
        </section>

        <section>
          <h2>3. Service providers</h2>
          <ul>
            <li>
              <strong>Supabase</strong> provides authentication, Postgres
              database storage, and project asset storage.
            </li>
            <li>
              <strong>Cloudflare Turnstile</strong> helps protect public signup
              forms from automated abuse.
            </li>
            <li>
              <strong>Upstash</strong> applies privacy-conscious rate limits to
              public form and analytics requests.
            </li>
            <li>
              <strong>Resend</strong> delivers waitlist confirmation, referral,
              and unsubscribe messages when email is configured.
            </li>
            <li>
              <strong>Vercel or the configured host</strong> serves the
              application and may process standard request logs under its own
              settings.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. How information is used</h2>
          <p>
            Information is used to provide accounts, publish waitlists, prevent
            abuse, deliver requested email, attribute referrals, show project
            analytics, export subscriber data for the project owner, investigate
            failures, and keep the service secure. LaunchBeam does not implement
            third-party advertising profiles or sell subscriber information in
            this beta codebase.
          </p>
        </section>

        <section>
          <h2>5. Project owners and subscriber data</h2>
          <p>
            Each project owner controls the purpose of their waitlist and is
            responsible for an appropriate notice, lawful collection, and
            handling of subscriber exports. Row Level Security and server-side
            ownership checks are designed to prevent one owner from reading
            another owner&apos;s projects, subscribers, or analytics.
          </p>
        </section>

        <section>
          <h2>6. Retention and deletion</h2>
          <p>
            The starter retains account and project data until the operator or
            account holder deletes it, subject to backups and legal obligations.
            Unsubscribing changes the subscriber status and does not automatically
            delete historical analytics. Project owners can remove subscriber
            records from their dashboard. A production operator should publish
            specific backup and deletion timelines before launch.
          </p>
        </section>

        <section>
          <h2>7. Security and choices</h2>
          <p>
            The application validates server inputs, restricts project access,
            rate-limits public mutations, and keeps service credentials on the
            server. No system is perfectly secure. Subscribers can use signed
            links in configured emails to unsubscribe; account holders can
            unpublish a project without deleting its history.
          </p>
        </section>

        <section>
          <h2>8. Requests and contact</h2>
          <p>
            Before production launch, the operator must replace this paragraph
            with a monitored privacy contact and jurisdiction-specific request
            process. Until then, requests should be sent to the contact channel
            published by the person or business operating this deployment and
            should identify the relevant waitlist and email address.
          </p>
        </section>
      </article>

      <footer className="legal-footer">
        <span>LaunchBeam beta</span>
        <div>
          <Link href="/">Home</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </footer>
    </main>
  );
}
