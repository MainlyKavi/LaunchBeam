import {
  ExternalLink,
  LayoutDashboard,
  Menu,
  Plus,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import "./dashboard.css";

export const metadata: Metadata = {
  title: {
    default: "Projects | LaunchBeam",
    template: "%s | LaunchBeam",
  },
  robots: { index: false, follow: false },
};

function getAccountInitial(email: string | null): string {
  return email?.trim().charAt(0) || "L";
}

function DashboardNavigation({ email }: { email: string | null }) {
  return (
    <>
      <aside className="db-sidebar">
        <Link className="db-brand" href="/dashboard" aria-label="LaunchBeam dashboard">
          <span className="db-brand-mark" aria-hidden="true" />
          <span>LaunchBeam</span>
        </Link>

        <p className="db-sidebar-kicker">Workspace</p>
        <nav className="db-nav" aria-label="Dashboard navigation">
          <Link className="db-nav-link" href="/dashboard">
            <LayoutDashboard aria-hidden="true" />
            Projects
          </Link>
          <Link className="db-nav-link" href="/dashboard/projects/new">
            <Plus aria-hidden="true" />
            New project
          </Link>
          <Link className="db-nav-link" href="/" target="_blank">
            <ExternalLink aria-hidden="true" />
            LaunchBeam site
          </Link>
        </nav>

        <div className="db-sidebar-spacer" />
        <div className="db-sidebar-tip">
          <strong>Launch workspace</strong>
          <span>Create, publish, and compare every waitlist in one place.</span>
        </div>

        <div className="db-account">
          <span className="db-avatar" aria-hidden="true">
            {getAccountInitial(email)}
          </span>
          <div className="db-account-copy">
            <strong>{email ?? "Setup mode"}</strong>
            <span>{email ? "Account owner" : "Configuration needed"}</span>
          </div>
          {email ? <LogoutButton /> : null}
        </div>
      </aside>

      <header className="db-mobile-header">
        <Link className="db-brand" href="/dashboard" aria-label="LaunchBeam dashboard">
          <span className="db-brand-mark" aria-hidden="true" />
          <span>LaunchBeam</span>
        </Link>
        <details className="db-mobile-menu">
          <summary aria-label="Open dashboard navigation">
            <Menu aria-hidden="true" />
          </summary>
          <div className="db-mobile-menu-panel">
            <nav className="db-nav" aria-label="Mobile dashboard navigation">
              <Link className="db-nav-link" href="/dashboard">
                <LayoutDashboard aria-hidden="true" />
                Projects
              </Link>
              <Link className="db-nav-link" href="/dashboard/projects/new">
                <Plus aria-hidden="true" />
                New project
              </Link>
              <Link className="db-nav-link" href="/" target="_blank">
                <ExternalLink aria-hidden="true" />
                LaunchBeam site
              </Link>
            </nav>
            <div className="db-mobile-account">
              <span>{email ?? "Setup mode"}</span>
              {email ? <LogoutButton /> : null}
            </div>
          </div>
        </details>
      </header>
    </>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    redirect(
      "/login?next=/dashboard&error=Account%20access%20is%20temporarily%20unavailable.",
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <div className="db-shell">
      <a className="skip-link" href="#dashboard-content">
        Skip to content
      </a>
      <DashboardNavigation email={user.email ?? null} />
      <div
        className="db-main"
        id="dashboard-content"
        tabIndex={-1}
      >
        <div className="db-content">{children}</div>
      </div>
    </div>
  );
}
