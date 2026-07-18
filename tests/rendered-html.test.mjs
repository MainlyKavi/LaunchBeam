import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const legacyBrand = ["Seed", "list"].join("");
const spacedBrand = ["Launch", "Beam"].join(" ");
const legacyFont = ["Mont", "serrat"].join("");

test("the LaunchBeam page has one positioning and campaign contract", async () => {
  const [landingPage, layout] = await Promise.all([
    readFile(new URL("../app/landing-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /LaunchBeam \| Build a waitlist and validate demand/i);
  assert.match(layout, /LaunchBeam's Demand Score/i);
  assert.match(landingPage, /Build an audience before you launch\./i);
  assert.match(landingPage, /Create a polished waitlist, reward referrals/i);
  assert.match(landingPage, /startup: "Northstar"/i);
  assert.match(landingPage, /visitors: 4260/);
  assert.match(landingPage, /signups: 1108/);
  assert.match(landingPage, /conversion: "26\.0%"/);
  assert.match(landingPage, /referralSignups: 312/);
  assert.match(landingPage, /demandScore: 78/);
  assert.match(landingPage, /Six honest answers\./i);
  assert.doesNotMatch(
    `${landingPage}\n${layout}`,
    new RegExp(`${legacyBrand}|${spacedBrand}|${legacyFont}`, "i"),
  );
  assert.doesNotMatch(landingPage, /react-loading-skeleton|Your site is taking shape/i);
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
  const [landingPage, layout, styles] = await Promise.all([
    readFile(new URL("../app/landing-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /--page:\s*#f5f5f7/i);
  assert.match(styles, /font-family:\s*var\(--font-geist-sans\)/);
  assert.match(layout, /const geist = Geist\(/);
  assert.doesNotMatch(
    `${layout}\n${styles}`,
    new RegExp(`${legacyFont}|font-${legacyFont.toLowerCase()}`, "i"),
  );
  assert.doesNotMatch(styles, /prefers-color-scheme|\.dark\b|data-theme=["']dark/i);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(landingPage, /aria-pressed=/);
  assert.match(landingPage, /aria-live="polite"/);
  assert.match(landingPage, /aria-expanded=/);
  assert.match(landingPage, /aria-controls=/);
  assert.match(landingPage, /href=\{`\?plan=\$\{plan\}#early-access`\}/);
  assert.match(landingPage, /Enter a valid email address\./);
  assert.doesNotMatch(landingPage, /signin-with-chatgpt|name:\s*["']Growth["']/i);
});

test("the marketing palette remains monochrome", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const colors = styles.match(/#[\da-f]{6}\b/gi) ?? [];

  for (const color of colors) {
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);
    assert.ok(
      Math.max(red, green, blue) - Math.min(red, green, blue) <= 5,
      `Unexpected non-monochrome color: ${color}`,
    );
  }

  assert.doesNotMatch(styles, /\b(?:blue|cyan|indigo|sky|teal)-\d+\b/i);
});

test("the beta signup endpoint validates requests before storage", async () => {
  const [route, migration] = await Promise.all([
    readFile(new URL("../app/api/beta-signups/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_classy_roulette.sql", import.meta.url), "utf8"),
  ]);

  assert.match(route, /EMAIL_PATTERN/);
  assert.match(route, /normalizedEmail\.length > 254/);
  assert.match(route, /plan !== "free" && plan !== "pro"/);
  assert.match(route, /consent !== true/);
  assert.match(route, /onConflictDoUpdate/);
  assert.match(route, /cache-control/);
  assert.match(migration, /CREATE TABLE `beta_signups`/);
  assert.match(migration, /`email` text NOT NULL/);
});
