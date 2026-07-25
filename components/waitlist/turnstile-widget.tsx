"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

type TurnstileOptions = {
  sitekey: string;
  theme: "light" | "dark" | "auto";
  size: "normal" | "compact" | "flexible";
  action: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: TurnstileOptions): string;
      reset(widgetId?: string): void;
      remove(widgetId: string): void;
    };
  }
}

export function TurnstileWidget({
  siteKey,
  theme,
  resetKey,
  onToken,
}: {
  siteKey: string | null;
  theme: "light" | "dark";
  resetKey: number;
  onToken: (token: string) => void;
}) {
  const developmentBypass =
    !siteKey && process.env.NODE_ENV !== "production";
  const reactId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!siteKey) {
      onToken(developmentBypass ? "development-bypass" : "");
      return;
    }

    if (!scriptReady || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      size: "flexible",
      action: "waitlist_signup",
      callback: (token) => {
        setHasError(false);
        onToken(token);
      },
      "expired-callback": () => onToken(""),
      "error-callback": () => {
        setHasError(true);
        onToken("");
      },
    });

    return () => {
      const widgetId = widgetIdRef.current;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
      widgetIdRef.current = null;
    };
  }, [developmentBypass, onToken, scriptReady, siteKey, theme]);

  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onToken("");
    }
  }, [onToken, resetKey]);

  if (!siteKey) {
    return (
      <p
        className={
          developmentBypass
            ? "waitlist-protection-note"
            : "waitlist-field-error"
        }
        role={developmentBypass ? undefined : "alert"}
      >
        {developmentBypass
          ? "Spam protection is bypassed for this local preview."
          : "Signups are unavailable until spam protection is configured."}
      </p>
    );
  }

  return (
    <div className="turnstile-field">
      <Script
        id={`turnstile-${reactId.replace(/:/g, "")}`}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setHasError(true)}
      />
      <div ref={containerRef} className="turnstile-container" />
      {hasError ? (
        <p className="waitlist-field-error" role="alert">
          Spam protection could not load. Check your connection and try again.
        </p>
      ) : null}
    </div>
  );
}
