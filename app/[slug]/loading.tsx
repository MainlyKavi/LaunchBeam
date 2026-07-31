import { LaunchBeamLogo } from "@/components/launchbeam-logo";

export default function PublicWaitlistLoading() {
  return (
    <main className="public-route-state" aria-busy="true" aria-live="polite">
      <div className="public-route-state-card">
        <LaunchBeamLogo className="route-state-logo" iconOnly />
        <div className="route-state-line is-short" />
        <div className="route-state-line is-title" />
        <div className="route-state-line" />
        <div className="route-state-form" />
        <span className="sr-only">Loading waitlist</span>
      </div>
    </main>
  );
}
