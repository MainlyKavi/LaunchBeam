"use client";

import Link from "next/link";

export default function PublicWaitlistError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="public-route-state">
      <section className="public-route-message">
        <Link className="brand" href="/" aria-label="LaunchBeam home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-wordmark">LaunchBeam</span>
        </Link>
        <p className="eyebrow">Temporary problem</p>
        <h1>This waitlist couldn&apos;t load.</h1>
        <p>Try again now. If it keeps happening, the project owner can help.</p>
        <button className="button primary" type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
