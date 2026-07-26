import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const legacyBrand = ["Seed", "list"].join("");
const spacedBrand = ["Launch", "Beam"].join(" ");
const legacyFont = ["Mont", "serrat"].join("");
const removedFont = ["Ge", "ist"].join("");
const removedHeroCopy = [
  "Publish in minutes",
  "grow through referrals",
  "and turn early interest into a clear Demand Score.",
].join(", ");

test("the LaunchBeam page has one positioning and campaign contract", async () => {
  const [landingPage, layout] = await Promise.all([
    readFile(new URL("../app/landing-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /LaunchBeam \| Build a waitlist and validate demand/i);
  assert.match(layout, /LaunchBeam's Demand Score/i);
  assert.match(landingPage, /Build an audience before you launch\./i);
  assert.match(landingPage, /startup: "Kimchi"/i);
  assert.match(landingPage, /visitors: 4260/);
  assert.match(landingPage, /signups: 1108/);
  assert.match(landingPage, /conversion: "26\.0%"/);
  assert.match(landingPage, /referralSignups: 312/);
  assert.match(landingPage, /demandScore: 78/);
  assert.match(landingPage, /slug: "kimchi"/);
  assert.match(
    landingPage,
    /headline: "Research that finds the signal in customer conversations\."/,
  );
  assert.match(
    landingPage,
    /Kimchi turns interviews and support calls into clear product decisions\./,
  );
  for (const templateId of [
    "minimal-beam",
    "kimchi",
    "kevinora",
    "spotbeam",
    "darkrai",
  ]) {
    assert.match(landingPage, new RegExp(`id: "${templateId}"`));
  }
  assert.match(landingPage, /Six honest answers\./i);
  assert.equal(landingPage.includes(removedHeroCopy), false);
  assert.doesNotMatch(
    `${landingPage}\n${layout}`,
    new RegExp(`${legacyBrand}|${spacedBrand}|${legacyFont}`, "i"),
  );
  assert.doesNotMatch(landingPage, /react-loading-skeleton|Your site is taking shape/i);
});

test("Argentum Sans is bundled locally with real interface weights", async () => {
  const [styles, layout, regular, medium, semibold, license] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/fonts/ArgentumSans-Regular.woff2", import.meta.url)),
    readFile(new URL("../public/fonts/ArgentumSans-Medium.woff2", import.meta.url)),
    readFile(new URL("../public/fonts/ArgentumSans-SemiBold.woff2", import.meta.url)),
    readFile(new URL("../public/fonts/OFL.txt", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /ArgentumSans-Regular\.woff2/);
  assert.match(styles, /ArgentumSans-Medium\.woff2/);
  assert.match(styles, /ArgentumSans-SemiBold\.woff2/);
  assert.match(layout, /ArgentumSans-Regular\.woff2/);
  assert.match(layout, /ArgentumSans-SemiBold\.woff2/);
  assert.equal((styles.match(/font-display:\s*swap/g) ?? []).length, 3);
  assert.ok(regular.length > 10_000);
  assert.ok(medium.length > 10_000);
  assert.ok(semibold.length > 10_000);
  assert.match(license, /SIL OPEN FONT LICENSE/i);
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
  assert.match(
    styles,
    /--font-sans:\s*"Argentum Sans",\s*"Helvetica Neue",\s*Arial,\s*sans-serif/,
  );
  assert.match(styles, /font-family:\s*var\(--font-sans\)/);
  assert.doesNotMatch(layout, new RegExp(removedFont, "i"));
  assert.doesNotMatch(
    `${layout}\n${styles}`,
    new RegExp(`${legacyFont}|font-${legacyFont.toLowerCase()}`, "i"),
  );
  assert.doesNotMatch(styles, /prefers-color-scheme|\.dark\b|data-theme=["']dark/i);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /\.section-inner\[id\][\s\S]*scroll-margin-top:\s*96px/);
  assert.match(styles, /\.motion-ready \[data-reveal\]/);
  assert.match(landingPage, /aria-pressed=/);
  assert.match(landingPage, /aria-live="polite"/);
  assert.match(landingPage, /aria-expanded=/);
  assert.match(landingPage, /aria-controls=/);
  assert.match(
    landingPage,
    /const accountHref = isAuthenticated \? "\/dashboard" : "\/signup"/,
  );
  assert.match(
    landingPage,
    /const accountLabel = isAuthenticated\s*\?\s*"Open dashboard"\s*:\s*"Create your waitlist"/,
  );
  assert.match(landingPage, /Try the interactive demo/);
  assert.doesNotMatch(
    landingPage,
    /beta-signups|Request beta access|Accounts are not open yet|Prototype control|Planned for beta/i,
  );
  assert.doesNotMatch(landingPage, /signin-with-chatgpt|name:\s*["']Growth["']/i);
});

test("the marketing palette keeps restrained, explicit template previews", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const windowControlColors = new Set(["#ff5f57", "#febc2e", "#28c840"]);

  for (const templateId of [
    "minimal-beam",
    "kimchi",
    "kevinora",
    "spotbeam",
    "darkrai",
  ]) {
    assert.match(styles, new RegExp(`\\.template-swatch\\.${templateId}`));
    assert.match(styles, new RegExp(`\\.template-${templateId}`));
  }

  for (const color of windowControlColors) {
    assert.match(styles.toLowerCase(), new RegExp(color));
  }

  assert.doesNotMatch(styles, /\b(?:blue|cyan|indigo|sky|teal)-\d+\b/i);
});

test("the production application uses the native Next target and Supabase APIs", async () => {
  const [subscribeRoute, projectRoute, migration, vercelConfig, packageJson] =
    await Promise.all([
      readFile(
        new URL("../app/api/public/[slug]/subscribe/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/api/projects/route.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../supabase/migrations/0001_launchbeam.sql", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../vercel.json", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
    ]);

  assert.match(subscribeRoute, /subscribeSchema\.safeParse/);
  assert.match(subscribeRoute, /subscribe_to_waitlist/);
  assert.match(subscribeRoute, /verifyTurnstileToken/);
  assert.match(projectRoute, /createServerSupabaseClient/);
  assert.match(projectRoute, /\.from\("projects"\)/);
  assert.match(vercelConfig, /"framework":\s*"nextjs"/);
  assert.match(vercelConfig, /"buildCommand":\s*"npm run build:vercel"/);
  assert.match(packageJson, /"build:vercel":\s*"next build"/);
  assert.match(
    packageJson,
    /"seed:kimchi":\s*"node --env-file-if-exists=\.env\.local scripts\/seed-kimchi\.mjs"/,
  );
  assert.doesNotMatch(packageJson, /drizzle|db:generate/i);
  assert.match(migration, /create table if not exists public\.projects/);
  assert.match(migration, /create table if not exists public\.subscribers/);
  assert.match(migration, /create table if not exists public\.events/);
});
