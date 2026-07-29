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
import {
  contrastRatio,
  isSafeOpaqueHexColor,
  isSafePersistedHexColor,
  readableTextColor,
} from "../lib/color-contrast.ts";
import {
  DEFAULT_PROJECT_CONTENT,
  createStarterProjectContent,
} from "../lib/types.ts";
import {
  signToken,
  verifySignedToken,
} from "../lib/tokens.ts";

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

test("starter content follows the project identity without changing Kimchi defaults", () => {
  const starter = createStarterProjectContent("Orbit Notes");
  assert.equal(starter.productName, "Orbit Notes");
  assert.match(starter.headline, /Orbit Notes/);
  assert.match(starter.description, /Orbit Notes/);
  assert.equal(starter.logoUrl, null);
  assert.equal(starter.heroImageUrl, null);
  assert.equal(starter.screenshotUrl, null);
  assert.equal(starter.backgroundImageUrl, null);
  assert.equal(DEFAULT_PROJECT_CONTENT.productName, "Kimchi");
  assert.match(DEFAULT_PROJECT_CONTENT.headline, /customer conversations/);
});

test("theme contrast stays measurable and solid buttons choose readable text", () => {
  assert.ok((contrastRatio("#18151f", "#e9e5ff") ?? 0) >= 4.5);
  assert.ok((contrastRatio("#625b6c", "#e9e5ff") ?? 0) >= 4.5);
  assert.equal(isSafeOpaqueHexColor("#abc"), true);
  assert.equal(isSafeOpaqueHexColor("#aabbcc"), true);
  assert.equal(isSafeOpaqueHexColor("#abcd"), false);
  assert.equal(isSafeOpaqueHexColor("#aabbccdd"), false);
  assert.equal(isSafePersistedHexColor("#abcd"), true);
  assert.equal(isSafePersistedHexColor("#aabbccdd"), true);
  assert.equal(isSafePersistedHexColor("rgb(0 0 0)"), false);
  assert.equal(readableTextColor("#9caeff"), "#000000");
  assert.equal(readableTextColor("#171719"), "#ffffff");
  assert.equal(contrastRatio("#fff", "#fff"), 1);
  assert.equal(contrastRatio("not-a-color", "#fff"), null);
});

test("signed email tokens reject tampering, wrong purpose, and expiry", () => {
  const previousSecret = process.env.EMAIL_TOKEN_SECRET;
  process.env.EMAIL_TOKEN_SECRET =
    "launchbeam-test-secret-is-longer-than-thirty-two-characters";
  try {
    const valid = signToken({
      purpose: "unsubscribe",
      projectId: "project-1",
      subscriberId: "subscriber-1",
      expiresAt: Date.now() + 60_000,
    });
    assert.equal(
      verifySignedToken(valid, "unsubscribe")?.subscriberId,
      "subscriber-1",
    );
    assert.equal(verifySignedToken(`${valid}x`, "unsubscribe"), null);
    assert.equal(verifySignedToken(valid, "confirm"), null);

    const expired = signToken({
      purpose: "confirm",
      projectId: "project-1",
      subscriberId: "subscriber-1",
      expiresAt: Date.now() - 1,
    });
    assert.equal(verifySignedToken(expired, "confirm"), null);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.EMAIL_TOKEN_SECRET;
    } else {
      process.env.EMAIL_TOKEN_SECRET = previousSecret;
    }
  }
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
  assert.match(
    validation,
    /persistedProjectThemeSchema = createProjectThemeSchema\(\s*isSafePersistedHexColor/,
  );
  assert.match(
    validation,
    /projectThemeSchema = createProjectThemeSchema\(\s*isSafeOpaqueHexColor/,
  );
  assert.match(
    records,
    /persistedProjectThemeSchema\.safeParse\(row\.theme\)/,
  );
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

test("production hardening upgrades existing databases without prototype state", async () => {
  const [
    migration,
    analytics,
    subscribeRoute,
    exportRoute,
    projectRoute,
    rateLimit,
    turnstile,
    unsubscribeRoute,
  ] =
    await Promise.all([
      readFile(
        new URL(
          "../supabase/migrations/0002_production_hardening.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../lib/analytics-dashboard.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/public/[slug]/subscribe/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/api/projects/[projectId]/export/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/api/projects/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/rate-limit.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/turnstile.ts", import.meta.url), "utf8"),
      readFile(
        new URL(
          "../app/api/public/[slug]/unsubscribe/route.ts",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  assert.match(migration, /drop table if exists public\.beta_signups/);
  assert.match(
    migration,
    /drop index if exists public\.projects_one_active_per_owner_idx/,
  );
  assert.match(migration, /projects_slug_not_reserved/);
  assert.match(migration, /get_project_analytics_totals/);
  assert.match(
    migration,
    /v_existing\.status = 'pending'[\s\S]*?previous_confirmation_token_hash = s\.confirmation_token_hash,[\s\S]*?confirmation_token_hash = p_confirmation_token_hash/,
  );
  assert.match(
    migration,
    /s\.confirmation_token_hash = p_confirmation_token_hash[\s\S]*?or s\.previous_confirmation_token_hash = p_confirmation_token_hash/,
  );
  assert.match(
    migration,
    /insert into public\.events[\s\S]*?'signup'[\s\S]*?if v_referral_awarded then[\s\S]*?'referral_signup'/,
  );
  assert.match(
    migration,
    /create policy "owners delete project assets"[\s\S]*?p\.owner_id = \(select auth\.uid\(\)\)/,
  );

  assert.match(analytics, /get_project_analytics_totals/);
  assert.match(subscribeRoute, /:ip:/);
  assert.match(subscribeRoute, /:email:/);
  const turnstileInvocation = subscribeRoute.indexOf(
    "const turnstile = await verifyTurnstileToken",
  );
  assert.ok(
    subscribeRoute.indexOf(":ip:") <
      turnstileInvocation &&
      turnstileInvocation <
        subscribeRoute.indexOf(":email:"),
    "network limiting must precede Turnstile, and email limiting must follow it",
  );
  assert.match(rateLimit, /timeout:\s*1_500/);
  assert.match(rateLimit, /result\.reason === "timeout"/);
  assert.match(turnstile, /TURNSTILE_TIMEOUT_MS = 5_000/);
  assert.match(turnstile, /signal:\s*controller\.signal/);
  assert.doesNotMatch(projectRoute, /project_limit_reached/);
  assert.match(exportRoute, /\.order\("created_at"[\s\S]*?\.order\("id"/);
  const unsubscribePost = unsubscribeRoute.indexOf("export async function POST");
  assert.ok(unsubscribePost > 0);
  assert.doesNotMatch(
    unsubscribeRoute.slice(0, unsubscribePost),
    /\.update\(\{\s*status:\s*"unsubscribed"/,
  );
  assert.match(
    unsubscribeRoute.slice(unsubscribePost),
    /\.update\(\{\s*status:\s*"unsubscribed"/,
  );

  for (const column of [
    "email",
    "name",
    "status",
    "position",
    "referral_count",
    "referred_by",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "created_at",
  ]) {
    assert.match(exportRoute, new RegExp(`"${column}"`));
  }
  assert.doesNotMatch(exportRoute, /"referral_url"/);
});

test("application integrity migration and routes preserve new invariants", async () => {
  const [
    migration,
    editor,
    unsubscribeRoute,
    subscriberRoute,
    assetsRoute,
    analytics,
    dashboard,
  ] = await Promise.all([
    readFile(
      new URL(
        "../supabase/migrations/0003_application_integrity.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../components/editor/project-editor.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/api/public/[slug]/unsubscribe/route.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/api/projects/[projectId]/subscribers/[subscriberId]/route.ts",
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
    readFile(new URL("../lib/analytics-dashboard.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /grant select, insert, update, delete[\s\S]*to service_role/);
  assert.match(
    migration,
    /jsonb_set\(theme,\s*'\{muted\}',\s*'"#625b6c"'::jsonb\)[\s\S]*?where theme =[\s\S]*?"muted": "#6f6879"/,
  );
  assert.match(
    migration,
    /e\.event_type = 'referral_signup'[\s\S]*p_start is null/,
  );
  assert.match(migration, /notify pgrst, 'reload schema'/);
  const subscriberPolicyStart = migration.indexOf(
    'create policy "owners update subscribers"',
  );
  const subscriberPolicyEnd = migration.indexOf(
    "-- Referral totals",
    subscriberPolicyStart,
  );
  assert.ok(subscriberPolicyStart >= 0 && subscriberPolicyEnd > subscriberPolicyStart);
  const subscriberPolicy = migration.slice(
    subscriberPolicyStart,
    subscriberPolicyEnd,
  );
  assert.match(subscriberPolicy, /for update[\s\S]*?to authenticated/);
  assert.match(
    subscriberPolicy,
    /with check \(\s*status = 'unsubscribed'[\s\S]*?projects\.owner_id = \(select auth\.uid\(\)\)/,
  );
  assert.doesNotMatch(subscriberPolicy, /status = 'subscribed'/);
  assert.match(editor, /saveQueueRef/);
  assert.doesNotMatch(editor, /abortRef/);
  assert.match(unsubscribeRoute, /\.eq\("id", payload\.projectId\)/);
  assert.match(subscriberRoute, /z\.literal\("unsubscribed"\)/);
  assert.doesNotMatch(subscriberRoute, /z\.enum\(\["subscribed"/);
  assert.match(assetsRoute, /content\.data\.screenshotUrl/);
  assert.match(assetsRoute, /content\.data\.backgroundImageUrl/);
  assert.match(analytics, /\.eq\("event_type", "referral_signup"\)/);
  assert.match(
    analytics,
    /truncated:\s*events\.length >= MAXIMUM_EVENT_ROWS\s*\|\|\s*subscribers\.length >= MAXIMUM_SUBSCRIBER_ROWS/,
  );
  assert.match(
    dashboard,
    /\.from\("events"\)[\s\S]*?\.eq\("event_type", "referral_signup"\)/,
  );
  assert.doesNotMatch(
    dashboard,
    /\.not\("referred_by", "is", null\)/,
  );
});

test("project archive and restore stay owner-scoped and reversible", async () => {
  const [archiveRoute, publishRoute, statusButtons, dashboard] =
    await Promise.all([
      readFile(
        new URL(
          "../app/api/projects/[projectId]/archive/route.ts",
          import.meta.url,
        ),
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
          "../app/dashboard/project-status-button.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    ]);

  assert.match(archiveRoute, /MAXIMUM_ARCHIVE_BODY_BYTES = 1_024/);
  assert.match(
    archiveRoute,
    /archiveActionSchema[\s\S]*?archive:\s*z\.boolean\(\)[\s\S]*?\.strict\(\)/,
  );
  assert.match(
    archiveRoute,
    /readJsonBody\(request,\s*MAXIMUM_ARCHIVE_BODY_BYTES\)/,
  );
  assert.match(archiveRoute, /getSupabaseAdmin\(\)/);
  assert.ok(
    (archiveRoute.match(/\.eq\("owner_id", user\.id\)/g) ?? []).length >= 2,
    "both ownership lookup and admin mutation must remain owner-scoped",
  );
  assert.match(
    archiveRoute,
    /currentProject\.status === "draft"[\s\S]*?currentProject\.status === "published"/,
  );
  assert.match(
    archiveRoute,
    /currentProject\.status === "archived"/,
  );
  assert.match(
    archiveRoute,
    /action\.data\.archive \? "archived" : "draft"/,
  );
  assert.match(
    archiveRoute,
    /\.eq\("status", currentProject\.status\)/,
  );
  assert.match(
    archiveRoute,
    /revalidatePath\(`\/\$\{updatedProject\.slug\}`\)/,
  );
  assert.match(
    publishRoute,
    /currentProject\.status === "archived"[\s\S]*?"project_archived"/,
  );
  assert.match(
    statusButtons,
    /window\.confirm\([\s\S]*?public waitlist will be unavailable/,
  );
  assert.match(
    statusButtons,
    /fetch\(`\/api\/projects\/\$\{projectId\}\/archive`/,
  );
  assert.match(statusButtons, /aria-busy=\{submitting\}/);
  assert.match(statusButtons, /role="alert"/);
  assert.match(dashboard, /<ProjectArchiveButton/);
});
