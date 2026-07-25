"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  configured: boolean;
  initialMessage?: string;
  mode: AuthMode;
  nextPath?: string;
};

type FormNotice = {
  kind: "error" | "success";
  text: string;
};

function getFriendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "That email and password combination was not recognized.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Confirm your email address before signing in.";
  }

  if (normalized.includes("already registered")) {
    return "An account already exists for this email. Try signing in instead.";
  }

  if (normalized.includes("password")) {
    return "Use a password with at least 8 characters.";
  }

  return "We could not complete that request. Please try again.";
}

export function AuthForm({
  configured,
  initialMessage,
  mode,
  nextPath = "/dashboard",
}: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<FormNotice | null>(
    initialMessage ? { kind: "error", text: initialMessage } : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!configured) {
      setNotice({
        kind: "error",
        text: "Authentication is not configured for this deployment yet.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setNotice({ kind: "error", text: getFriendlyAuthError(error.message) });
          return;
        }

        router.replace(nextPath);
        router.refresh();
        return;
      }

      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        setNotice({ kind: "error", text: getFriendlyAuthError(error.message) });
        return;
      }

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setNotice({
        kind: "success",
        text: "Check your inbox to confirm your email address, then return here to sign in.",
      });
      setPassword("");
    } catch {
      setNotice({
        kind: "error",
        text: "LaunchBeam could not reach the authentication service. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="lb-auth-heading">
        <h1>{isLogin ? "Welcome back" : "Start validating demand"}</h1>
        <p>
          {isLogin
            ? "Sign in to manage your waitlist and see what the market is telling you."
            : "Create your account and turn an early idea into a signal you can measure."}
        </p>
      </div>

      <form className="lb-auth-form" onSubmit={handleSubmit}>
        {!configured ? (
          <div className="lb-auth-message" data-kind="error" role="alert">
            Add the public Supabase URL and anonymous key to enable account
            access.
          </div>
        ) : null}

        {notice ? (
          <div
            className="lb-auth-message"
            data-kind={notice.kind}
            role={notice.kind === "error" ? "alert" : "status"}
          >
            {notice.text}
          </div>
        ) : null}

        <div className="lb-auth-field">
          <label htmlFor={`${mode}-email`}>Email address</label>
          <input
            className="lb-auth-input"
            id={`${mode}-email`}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            placeholder="you@company.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="lb-auth-field">
          <div className="lb-auth-field-head">
            <label htmlFor={`${mode}-password`}>Password</label>
            {!isLogin ? <span>8 characters minimum</span> : null}
          </div>
          <input
            className="lb-auth-input"
            id={`${mode}-password`}
            type="password"
            name="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            minLength={isLogin ? undefined : 8}
            maxLength={128}
            placeholder={isLogin ? "Your password" : "Choose a secure password"}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button
          className="lb-auth-submit"
          type="submit"
          disabled={submitting || !configured}
        >
          {submitting
            ? isLogin
              ? "Signing in…"
              : "Creating account…"
            : isLogin
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="lb-auth-switch">
        {isLogin ? "New to LaunchBeam?" : "Already have an account?"}{" "}
        <Link href={isLogin ? "/signup" : "/login"}>
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>

      <p className="lb-auth-note">
        Your account keeps project drafts and subscriber data private.
      </p>
    </>
  );
}
