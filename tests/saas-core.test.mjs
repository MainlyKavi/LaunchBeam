import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  hasValidSlugShape,
  normalizeSlug,
} from "../lib/normalize-slug.ts";
import {
  RESERVED_SLUGS,
  isReservedSlug,
} from "../lib/reserved-slugs.ts";
import {
  DEMAND_SCORE_MINIMUM_VISITORS,
  calculateDemandScore,
} from "../lib/demand-score.ts";
import {
  escapeCsvCell,
  protectSpreadsheetFormula,
  rowsToCsv,
} from "../lib/csv.ts";

test("slug normalization and reserved routes enforce the public URL contract", () => {
  assert.equal(normalizeSlug("  My Launch!! -- 2026  "), "my-launch-2026");
  assert.equal(normalizeSlug("---Kimchi---"), "kimchi");
  assert.equal(normalizeSlug("Café Déjà Vu"), "caf-dj-vu");

  assert.equal(hasValidSlugShape("abc"), true);
  assert.equal(hasValidSlugShape("a".repeat(40)), true);
  assert.equal(hasValidSlugShape("ab"), false);
  assert.equal(hasValidSlugShape("a".repeat(41)), false);
  assert.equal(hasValidSlugShape("-launch"), false);
  assert.equal(hasValidSlugShape("launch-"), false);
  assert.equal(hasValidSlugShape("launch--beam"), false);
  assert.equal(hasValidSlugShape("LaunchBeam"), false);

  for (const route of [
    "api",
    "dashboard",
    "auth",
    "preview",
    "privacy",
    "terms",
    "robots.txt",
    "_next",
  ]) {
    assert.equal(RESERVED_SLUGS.has(route), true, `${route} must stay reserved`);
    assert.equal(isReservedSlug(route.toUpperCase()), true);
  }
  assert.equal(isReservedSlug("kimchi"), false);
});

test("Demand Score stays hidden below 100 visitors and remains bounded", () => {
  const belowThreshold = calculateDemandScore({
    uniqueVisitors: DEMAND_SCORE_MINIMUM_VISITORS - 1,
    signups: 20,
    referralSignups: 5,
    recentSignups: 8,
    previousSignups: 4,
  });
  assert.equal(belowThreshold.eligible, false);
  assert.equal(belowThreshold.score, null);
  assert.equal(belowThreshold.minimumVisitors, 100);

  const eligible = calculateDemandScore({
    uniqueVisitors: 100,
    signups: 25,
    referralSignups: 8,
    recentSignups: 10,
    previousSignups: 5,
  });
  assert.deepEqual(eligible.components, {
    conversion: 100,
    referral: 100,
    volume: 32,
    momentum: 100,
  });
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.score, 86);

  const extremeInputs = [
    {
      uniqueVisitors: 100,
      signups: 1_000_000,
      referralSignups: 2_000_000,
      recentSignups: 1_000_000,
      previousSignups: 1,
    },
    {
      uniqueVisitors: -50,
      signups: -10,
      referralSignups: -4,
      recentSignups: -2,
      previousSignups: -8,
    },
    {
      uniqueVisitors: Number.NaN,
      signups: Number.POSITIVE_INFINITY,
      referralSignups: Number.NEGATIVE_INFINITY,
      recentSignups: Number.NaN,
      previousSignups: 0,
    },
  ];

  for (const input of extremeInputs) {
    const result = calculateDemandScore(input);
    for (const component of Object.values(result.components)) {
      assert.equal(Number.isInteger(component), true);
      assert.ok(component >= 0 && component <= 100);
    }
    if (result.score !== null) {
      assert.equal(Number.isInteger(result.score), true);
      assert.ok(result.score >= 0 && result.score <= 100);
    }
  }
});

test("CSV output escapes syntax and neutralizes spreadsheet formulas", () => {
  assert.equal(protectSpreadsheetFormula("=1+1"), "'=1+1");
  assert.equal(protectSpreadsheetFormula("  @SUM(A1:A2)"), "'  @SUM(A1:A2)");
  assert.equal(protectSpreadsheetFormula("ordinary"), "ordinary");
  assert.equal(escapeCsvCell('Ada, "Launch"'), '"Ada, ""Launch"""');
  assert.equal(escapeCsvCell(null), '""');

  const csv = rowsToCsv(
    ["email", "name", "note"],
    [
      ["founder@example.com", "=HYPERLINK(\"https://evil.example\")", "a,b"],
      ["safe@example.com", "Normal", "line one\nline two"],
    ],
  );

  assert.equal(csv.startsWith("\uFEFF"), true);
  assert.match(csv, /^﻿"email","name","note"\r\n/);
  assert.match(
    csv,
    /"founder@example\.com","'=HYPERLINK\(""https:\/\/evil\.example""\)","a,b"/,
  );
  assert.match(csv, /"safe@example\.com","Normal","line one\nline two"\r\n$/);
});

test("project validation stays strict and Kimchi remains the universal fallback", async () => {
  const [validation, records, types, migration] = await Promise.all([
    readFile(new URL("../lib/validation/project.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/project-records.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/types.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../supabase/migrations/0001_launchbeam.sql", import.meta.url),
      "utf8",
    ),
  ]);

  assert.ok((validation.match(/\.strict\(\)/g) ?? []).length >= 6);
  assert.match(validation, /SAFE_PROTOCOLS\s*=\s*new Set\(\["http:", "https:"\]\)/);
  assert.match(validation, /templateId:\s*templateIdSchema\.default\("kimchi"\)/);
  assert.match(records, /return\s+TEMPLATE_IDS\.includes[\s\S]*?:\s*"kimchi";/);
  assert.match(types, /templateId:\s*"kimchi"\s+as const/);
  assert.match(migration, /template_id text not null default 'kimchi'/);
  assert.match(
    migration,
    /template_id in \([\s\S]*?'minimal-beam'[\s\S]*?'kimchi'[\s\S]*?'darkrai'/,
  );
});

test("public payload schemas reject unknown fields and constrain event types", async () => {
  const [subscriberValidation, analyticsValidation, subscribeRoute] =
    await Promise.all([
      readFile(
        new URL("../lib/validation/subscriber.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../lib/validation/analytics.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../app/api/public/[slug]/subscribe/route.ts",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  assert.match(subscriberValidation, /export const subscribeSchema[\s\S]*?\.strict\(\)/);
  assert.match(subscriberValidation, /max\(254\)[\s\S]*?\.email\(/);
  assert.match(subscriberValidation, /customAnswer[\s\S]*?optionalShortText\(500\)/);
  assert.match(analyticsValidation, /z\.enum\(\["page_view", "referral_visit", "share_click"\]\)/);
  assert.ok((analyticsValidation.match(/\.strict\(\)/g) ?? []).length >= 2);
  assert.match(subscribeRoute, /subscribeSchema\.safeParse\(payload\)/);
  assert.match(subscribeRoute, /verifyTurnstileToken\(/);
  assert.match(subscribeRoute, /checkRateLimit\(\s*"signup"/);
});

test("mutations are owner-scoped in routes and protected by RLS", async () => {
  const [projectRoute, publishRoute, assetsRoute, migration] =
    await Promise.all([
      readFile(
        new URL("../app/api/projects/[projectId]/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../app/api/projects/[projectId]/publish/route.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../app/api/projects/[projectId]/assets/route.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../supabase/migrations/0001_launchbeam.sql", import.meta.url),
        "utf8",
      ),
    ]);

  assert.ok(
    (projectRoute.match(/\.eq\("owner_id", user\.id\)/g) ?? []).length >= 4,
  );
  assert.match(
    projectRoute,
    /\.update\(updates\)[\s\S]*?\.eq\("id", projectId\)[\s\S]*?\.eq\("owner_id", user\.id\)/,
  );
  assert.match(
    projectRoute,
    /\.delete\(\)[\s\S]*?\.eq\("id", projectId\)[\s\S]*?\.eq\("owner_id", user\.id\)/,
  );
  assert.match(
    publishRoute,
    /\.update\(updates\)[\s\S]*?\.eq\("id", projectId\)[\s\S]*?\.eq\("owner_id", user\.id\)/,
  );
  assert.match(assetsRoute, /\.eq\("owner_id", user\.id\)/);

  assert.match(
    migration,
    /create policy "owners create projects"[\s\S]*?with check \(owner_id = \(select auth\.uid\(\)\)\)/,
  );
  assert.match(
    migration,
    /create policy "owners update projects"[\s\S]*?using \(owner_id = \(select auth\.uid\(\)\)\)[\s\S]*?with check \(owner_id = \(select auth\.uid\(\)\)\)/,
  );
  assert.match(
    migration,
    /create policy "owners delete projects"[\s\S]*?using \(owner_id = \(select auth\.uid\(\)\)\)/,
  );
  assert.match(
    migration,
    /revoke all on public\.subscribers from anon, authenticated;/,
  );
  assert.match(
    migration,
    /grant execute on function public\.subscribe_to_waitlist\([\s\S]*?\) to service_role;/,
  );
});

test("database constraints and RPC preserve duplicate and referral invariants", async () => {
  const [migration, createRoute, eventsRoute] = await Promise.all([
    readFile(
      new URL("../supabase/migrations/0001_launchbeam.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/api/projects/route.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/public/[slug]/events/route.ts", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(migration, /slug text not null unique/);
  assert.match(migration, /unique\(project_id, email\)/);
  assert.match(createRoute, /error\?\.code === "23505"/);
  assert.match(
    migration,
    /where s\.project_id = v_project\.id\s+and s\.email = v_email\s+for update;[\s\S]*?if found then[\s\S]*?v_existing\.referral_count,\s+true,\s+false;/,
  );

  assert.match(
    migration,
    /where s\.project_id = v_project\.id\s+and s\.referral_code = upper\(trim\(p_referral_code\)\)\s+and s\.status = 'subscribed'\s+and s\.email <> v_email\s+for update;/,
  );
  assert.match(migration, /check \(referred_by is null or referred_by <> id\)/);
  assert.match(
    migration,
    /foreign key \(project_id, referred_by\)[\s\S]*?references public\.subscribers\(project_id, id\)/,
  );
  assert.match(
    eventsRoute,
    /\.eq\("project_id", projectId\)[\s\S]*?\.eq\("referral_code", referralCode\)/,
  );
  assert.match(
    migration,
    /where s\.id = v_subscriber\.referred_by\s+and s\.project_id = v_subscriber\.project_id\s+and s\.status = 'subscribed';/,
  );
});

test("position allocation is serialized per project and backed by uniqueness", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/0001_launchbeam.sql", import.meta.url),
    "utf8",
  );

  const lockIndex = migration.indexOf("pg_advisory_xact_lock");
  const positionIndex = migration.indexOf("max(s.position)", lockIndex);
  const insertIndex = migration.indexOf(
    "insert into public.subscribers",
    positionIndex,
  );

  assert.ok(lockIndex >= 0, "the signup RPC must take an advisory lock");
  assert.match(
    migration,
    /hashtextextended\(v_project\.id::text,\s*19790621\)/,
  );
  assert.ok(
    lockIndex < positionIndex && positionIndex < insertIndex,
    "the per-project lock must be acquired before position allocation and insert",
  );
  assert.match(migration, /unique\(project_id, position\)/);
  assert.doesNotMatch(
    migration.slice(lockIndex, insertIndex),
    /count\(\*\)\s*\+\s*1/i,
  );
});
