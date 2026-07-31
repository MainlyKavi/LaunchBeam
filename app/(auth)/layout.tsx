import Link from "next/link";
import type { ReactNode } from "react";
import { LaunchBeamLogo } from "@/components/launchbeam-logo";
import "../auth.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="lb-auth-shell">
      <div className="lb-auth-frame">
        <aside className="lb-auth-story" aria-label="About LaunchBeam">
          <Link className="lb-auth-brand" href="/" aria-label="LaunchBeam home">
            <LaunchBeamLogo inverse />
          </Link>

          <div className="lb-auth-story-copy">
            <span className="lb-auth-eyebrow">From idea to evidence</span>
            <h2>Know what the market is telling you.</h2>
            <p>
              Publish a beautiful waitlist, learn where demand comes from, and
              make your next product decision with evidence.
            </p>
          </div>

          <div className="lb-auth-signal-wrap">
            <span className="lb-auth-example-label">
              Example project signals
            </span>
            <div className="lb-auth-signal" aria-label="Example waitlist signals">
              <div>
                <strong>24.8%</strong>
                <span>conversion</span>
              </div>
              <div>
                <strong>1,284</strong>
                <span>subscribers</span>
              </div>
              <div>
                <strong>78</strong>
                <span>demand score</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="lb-auth-panel">
          <div className="lb-auth-card">
            <Link
              className="lb-auth-brand lb-auth-mobile-brand"
              href="/"
              aria-label="LaunchBeam home"
            >
              <LaunchBeamLogo />
            </Link>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
