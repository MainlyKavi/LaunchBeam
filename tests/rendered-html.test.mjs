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
  assert.match(landingPage, /Create a polished waitlist, reward referrals/i);
  assert.match(landingPage, /startup: "Kimchi"/i);
  assert.match(landingPage, /visitors: 4260/);
  assert.match(landingPage, /signups: 1108/);
  assert.match(landingPage, /conversion: "26\.0%"/);
  assert.match(landingPage, /referralSignups: 312/);
  assert.match(landingPage, /demandScore: 78/);
  assert.match(landingPage, /price: "\$9"/);
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
  assert.match(landingPage, /href=\{`\?plan=\$\{plan\}#early-access`\}/);
  assert.match(landingPage, /Enter a valid email address\./);
  assert.doesNotMatch(landingPage, /signin-with-chatgpt|name:\s*["']Growth["']/i);
});

test("the marketing palette remains monochrome outside macOS window controls", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const colors = styles.match(/#[\da-f]{6}\b/gi) ?? [];
  const windowControlColors = new Set(["#ff5f57", "#febc2e", "#28c840"]);

  for (const color of colors) {
    if (windowControlColors.has(color.toLowerCase())) continue;
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);
    assert.ok(
      Math.max(red, green, blue) - Math.min(red, green, blue) <= 5,
      `Unexpected non-monochrome color: ${color}`,
    );
  }

  for (const color of windowControlColors) {
    assert.match(styles.toLowerCase(), new RegExp(color));
  }

  assert.doesNotMatch(styles, /\b(?:blue|cyan|indigo|sky|teal)-\d+\b/i);
});

test("the beta signup endpoint validates requests before storage", async () => {
  const [route, database, migration, vercelConfig, packageJson] = await Promise.all([
    readFile(new URL("../app/api/beta-signups/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_classy_roulette.sql", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(route, /EMAIL_PATTERN/);
  assert.match(route, /normalizedEmail\.length > 254/);
  assert.match(route, /plan !== "free" && plan !== "pro"/);
  assert.match(route, /consent !== true/);
  assert.match(route, /onConflictDoUpdate/);
  assert.match(route, /cache-control/);
  assert.doesNotMatch(database, /^import\s+\{\s*env\s*\}\s+from\s+["']cloudflare:workers["']/m);
  assert.match(database, /await import\(["']cloudflare:workers["']\)/);
  assert.match(database, /process\.env\.VERCEL/);
  assert.match(vercelConfig, /"framework":\s*"nextjs"/);
  assert.match(vercelConfig, /"buildCommand":\s*"npm run build:vercel"/);
  assert.match(packageJson, /"build:vercel":\s*"next build"/);
  assert.match(migration, /CREATE TABLE `beta_signups`/);
  assert.match(migration, /`email` text NOT NULL/);
});
