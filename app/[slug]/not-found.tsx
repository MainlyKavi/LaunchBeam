import Link from "next/link";

export default function PublicWaitlistNotFound() {
  return (
    <main className="public-route-state">
      <section className="public-route-message">
        <Link className="brand" href="/" aria-label="LaunchBeam home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-wordmark">LaunchBeam</span>
        </Link>
        <p className="eyebrow">404</p>
        <h1>This waitlist isn&apos;t live.</h1>
        <p>
          The project may still be a draft, may have been unpublished, or the
          link may have changed.
        </p>
        <Link className="button primary" href="/">
          Visit LaunchBeam
        </Link>
      </section>
    </main>
  );
}
