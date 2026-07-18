import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the LaunchBeam landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>LaunchBeam \| Create your waitlist and validate demand<\/title>/i);
  assert.match(html, /Launch before you&#x27;re ready\./i);
  assert.match(html, /From idea to waitlist in minutes\./i);
  assert.match(html, /Example campaign data/i);
  assert.match(html, /Demand score/i);
  assert.match(html, /A few honest answers\./i);
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.doesNotMatch(html, /react-loading-skeleton|Your site is taking shape/i);
});

test("starter preview assets are no longer referenced", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /_sites-preview|codex-preview|SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("the redesign stays light-only and keeps accessible interactive controls", async () => {
  const [landingPage, styles] = await Promise.all([
    readFile(new URL("../app/landing-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /--page:\s*#F2F2F2/);
  assert.match(styles, /font-family:\s*var\(--font-montserrat\)/);
  assert.doesNotMatch(styles, /prefers-color-scheme|\.dark\b|data-theme=["']dark/i);
  assert.match(landingPage, /aria-pressed=/);
  assert.match(landingPage, /aria-live="polite"/);
  assert.match(landingPage, /aria-expanded=/);
  assert.match(landingPage, /aria-controls=/);
  assert.match(landingPage, /href=\{planSignupHref\(plan\.name\)\}/);
  assert.match(landingPage, /Enter a valid email address\./);
});

test("the marketing palette contains only approved monochrome colors", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const approved = new Set([
    "#000000",
    "#111111",
    "#666666",
    "#D8D8D8",
    "#E8E8E8",
    "#F2F2F2",
    "#FAFAFA",
    "#FFFFFF",
  ]);
  const colors = styles.match(/#[\da-f]{6}\b/gi) ?? [];

  for (const color of colors) {
    assert.ok(approved.has(color.toUpperCase()), `Unexpected color: ${color}`);
  }
});
