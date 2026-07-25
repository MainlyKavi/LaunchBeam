"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleLogout() {
    setSubmitting(true);
    setError(false);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(true);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="db-logout"
        type="button"
        title={error ? "Sign out failed — try again" : "Sign out"}
        aria-label={error ? "Sign out failed. Try again." : "Sign out"}
        disabled={submitting}
        onClick={handleLogout}
      >
        <LogOut aria-hidden="true" />
      </button>
      {error ? (
        <span className="db-logout-error" role="alert">
          Sign out failed. Try again.
        </span>
      ) : null}
    </>
  );
}
