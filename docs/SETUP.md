# LaunchBeam setup and verification

This guide covers the external services, local environment, database migration,
deployment, seed data, and end-to-end checks required to run LaunchBeam as a
multi-tenant waitlist SaaS.

The native Next.js/Vercel target is the primary target for the authenticated
SaaS and public API. The Vinext/Cloudflare target remains available for the
existing Sites workflow and renders the same application source.

## Prerequisites

- Node.js 22.x and npm
- A Supabase project
- A Vercel project for production deployment
- A Resend account and a domain you control
- A Cloudflare account for Turnstile
- An Upstash Redis database
- The Supabase CLI and a Docker-compatible runtime if you want a fully local
  Supabase stack

Install the repository dependencies:

```bash
npm ci
```

## Environment variables

Copy the example file to a local file that is not committed:

```powershell
Copy-Item .env.example .env.local
```

On macOS or Linux:

```bash
cp .env.example .env.local
```

Set every production value in Vercel Project Settings under Environment
Variables. Apply values to Production and to any Preview or Development
environment that will exercise the SaaS. Redeploy after changing a Vercel
environment variable.

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Browser-safe | Canonical application origin, such as `http://localhost:3000` or `https://launchbeam.example`. Do not add a trailing slash. |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe | Supabase anonymous/publishable client key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Supabase service-role key used by protected public endpoints. It bypasses RLS and must never be exposed to the browser. |
| `RESEND_API_KEY` | Server-only | Resend API key used for welcome and confirmation email. |
| `RESEND_FROM_EMAIL` | Server-only | Verified sender, for example `LaunchBeam <updates@updates.example.com>`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Browser-safe | Cloudflare Turnstile widget site key. |
| `TURNSTILE_SECRET_KEY` | Server-only | Cloudflare Turnstile Siteverify secret. |
| `UPSTASH_REDIS_REST_URL` | Server-only | Upstash Redis HTTPS REST endpoint. |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only | Upstash standard read-write REST token. |
| `EMAIL_TOKEN_SECRET` | Server-only | HMAC secret for referral cookies and unsubscribe links. It must contain at least 32 characters. |

Generate a strong `EMAIL_TOKEN_SECRET` locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Never commit `.env.local`, a service-role key, a Turnstile secret, an Upstash
token, a Resend key, or the HMAC secret.

## Supabase

### 1. Create the project and collect credentials

1. Create a Supabase project in the region appropriate for your users.
2. In the project Connect/API settings, copy the project URL to
   `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy the anonymous or publishable client key to
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Reveal the service-role key and save it as
   `SUPABASE_SERVICE_ROLE_KEY` only in server-side environment settings.
5. Confirm that all three values come from the same Supabase project.

The anonymous key is intentionally used by browser and cookie-based server
clients. The service-role key is used only by server routes that accept public
signups or analytics. Do not substitute the service-role key for the public
key.

### 2. Apply the database migrations

The version-controlled migrations are:

```text
supabase/migrations/0001_launchbeam.sql
supabase/migrations/0002_production_hardening.sql
supabase/migrations/0003_application_integrity.sql
```

Install the Supabase CLI using an official supported method. If this checkout
does not yet contain `supabase/config.toml`, initialize the local CLI metadata
once:

```bash
supabase init
```

If the CLI reports that the project is already initialized, continue. Then
authenticate, link this checkout to the remote project, inspect the pending
changes, and apply them:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
supabase migration list
```

If the CLI was installed as a project-local npm tool, use `npx supabase` in
place of `supabase`.

Do not create only the tables by hand. The migration also creates the
constraints, indexes, updated-at triggers, RLS policies, service-role-only RPC
functions, Storage bucket, and Storage policies required for safe operation.

Together the migrations create and harden:

- `projects`, `subscribers`, and `events`
- Owner-scoped RLS for projects, subscribers, and analytics
- Public read access only for published projects
- No direct anonymous subscriber or analytics writes
- Atomic `subscribe_to_waitlist` position, duplicate, referral, and signup-event
  handling
- Atomic `confirm_waitlist_subscription` confirmation and deferred referral
  credit
- A private `project-assets` Storage bucket
- Owner-folder Storage policies for select, insert, update, and delete
- A 5 MB upload limit for JPEG, PNG, WebP, and AVIF files
- Reserved-slug enforcement for new writes and public reads
- Explicit service-role grants and an owner policy that permits unsubscribe
  updates without allowing direct resubscribe bypasses
- Current project defaults, accessible legacy Kimchi theme backfill, and exact
  referral-conversion totals
- Exact range totals for analytics dashboards whose detailed chart rows are
  intentionally capped

Use the Supabase SQL editor to verify the result:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('projects', 'subscribers', 'events')
order by c.relname;

select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'subscribe_to_waitlist',
    'confirm_waitlist_subscription',
    'get_project_analytics_totals'
  )
order by proname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'project-assets';
```

Every listed table should report `rls_enabled = true`. The asset bucket should
remain private. Public waitlist pages refresh short-lived signed asset URLs on
each server render; making the bucket public weakens the intended access model.

### 3. Configure Supabase Auth

In Authentication settings:

1. Enable the Email provider and email/password signups.
2. Use a minimum password length of at least 8 characters to match the UI.
3. Keep email confirmation enabled for production. It can be disabled
   temporarily in an isolated local or test project.
4. Open URL Configuration.
5. Set Site URL to the production origin, for example
   `https://launchbeam.example`.
6. Add these Redirect URLs:

```text
http://localhost:3000/auth/callback
https://launchbeam.example/auth/callback
```

Replace the production hostname with the deployed hostname. If Vercel preview
deployments must support account signup, add a narrowly scoped Vercel preview
pattern supported by Supabase, such as:

```text
https://*-YOUR_TEAM_SLUG.vercel.app/**
```

Use an exact callback URL for production. Avoid a broad wildcard on a domain
you do not control.

LaunchBeam passes `/auth/callback` as the email signup redirect. A URL missing
from the Supabase allow list will send users to the wrong origin or cause the
confirmation exchange to fail.

Supabase account confirmation and per-project waitlist confirmation are
different features:

- Supabase Auth confirmation verifies a LaunchBeam account holder.
- The project setting "Require email confirmation" keeps a public subscriber
  pending until the LaunchBeam confirmation link is used.

### 4. Optional local Supabase stack

The hosted project is sufficient for local application development. To run
Supabase locally instead, initialize the CLI metadata, start Docker, and run:

```bash
supabase start
supabase db reset
supabase status
```

`db reset` is destructive to the local database. It reapplies all migrations
from scratch. Map the local API URL, anonymous key, and service-role key shown
by `supabase status` into `.env.local`.

Never run `supabase db reset --linked` against production.

## Resend email

1. In Resend, add a domain or a dedicated sending subdomain such as
   `updates.example.com`.
2. Copy the DNS records Resend provides into the authoritative DNS provider.
3. Wait until SPF and DKIM report verified. Add DMARC when appropriate for the
   domain.
4. Create an API key with permission to send email.
5. Set `RESEND_API_KEY`.
6. Set `RESEND_FROM_EMAIL` to a sender on the verified domain, for example
   `LaunchBeam <updates@updates.example.com>`.
7. Send a real waitlist signup to an inbox you control and inspect both the
   received message and the Resend delivery log.

Resend recommends a sending subdomain to isolate sending reputation. DNS
values must match the values Resend generated; do not copy example DNS values
from this guide.

Email is deliberately non-transactional. A delivery failure does not roll back
a successful database signup. The API returns `emailSent: false` and records a
redacted server error. If a project requires subscriber email confirmation,
working Resend delivery is operationally required or subscribers will remain
pending.

Official reference: [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction).

## Cloudflare Turnstile

1. In Cloudflare, create a Turnstile widget for the public waitlist.
2. Use Managed mode unless the project has a reason to choose another mode.
3. Allow the production hostname and any deliberate staging hostname.
4. Set the widget site key as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
5. Set its secret as `TURNSTILE_SECRET_KEY`.
6. Load a published waitlist and confirm that the widget completes before the
   signup button is submitted.

The client sends the action `waitlist_signup`, and the server requires the
Siteverify response to contain that same action. Turnstile tokens expire and
are single-use, so an expired form must complete a fresh challenge.

For normal local development, omit both Turnstile variables. In a
non-production process, the UI then shows a local-bypass notice and sends the
explicit `development-bypass` token. That bypass is rejected in production.
To exercise real verification locally, use a separate development widget that
allows `localhost`, and configure both of its keys.

Never configure only one Turnstile key. A public site key without the matching
server secret produces a widget token that the server cannot validate.

Official references:

- [Turnstile setup](https://developers.cloudflare.com/turnstile/get-started/)
- [Turnstile test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

## Upstash Redis

1. Create an Upstash Redis database.
2. In its REST API section, copy the HTTPS endpoint to
   `UPSTASH_REDIS_REST_URL`.
3. Copy the standard read-write token to
   `UPSTASH_REDIS_REST_TOKEN`.
4. Do not use the read-only token; the rate limiter writes counters.
5. Exercise both a public signup and a public analytics event, then confirm
   rate-limit keys appear in the database.

LaunchBeam separately limits each project-and-network signup source and each
project-and-email pair to 8 attempts per 10 minutes. Analytics events are
limited to 60 per minute for each project-scoped source. Identifiers are hashed
before they are stored as Redis keys; raw IP and email values are not used as
keys.

When Upstash is absent:

- Non-production requests are allowed for local development.
- Production signup and analytics endpoints fail closed with HTTP 503.

Official reference: [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi).

## Run locally

Start the full native Next.js application:

```bash
npm run dev:vercel
```

Open [http://localhost:3000](http://localhost:3000).

`npm run dev` starts the existing Vinext/Cloudflare development target. Use
`npm run dev:vercel` for the canonical auth, cookie, route-handler, and Vercel
SaaS verification flow.

With the hosted Supabase project, all Supabase variables and
`EMAIL_TOKEN_SECRET` are still required locally. Turnstile and Upstash can use
their documented non-production fallbacks. Resend can be omitted only when
email delivery and project-level subscriber confirmation are not under test.

## Create the Kimchi demonstration project

### Recommended: use the product UI

1. Create a LaunchBeam account and confirm the Supabase Auth email.
2. Sign in and open `/dashboard/projects/new`.
3. Enter project name `Kimchi`.
4. Enter slug `kimchi`.
5. Choose the `Kimchi` template.
6. Create the draft, review `/preview/PROJECT_ID`, and publish it.
7. Open `/kimchi` in a signed-out browser.

Kimchi is the default template. New projects also receive the Kimchi default
content, theme, and settings from the application and database.

### Optional: seed a non-production project

First create the owner through Supabase Auth and copy the owner UUID from
Authentication > Users. With the Supabase URL and service-role key present in
`.env.local`, run:

```bash
npm run seed:kimchi -- --owner-id YOUR_AUTH_USER_UUID
```

You may set `SEED_OWNER_ID` instead of passing the argument. The script verifies
that the UUID belongs to an existing Supabase Auth user, creates the exact
published Kimchi project, and exits idempotently only when the same owner and
exact seed already exist. If another or modified project owns the `kimchi`
slug, it fails without changing data. Do not hardcode a production owner, run
seed data automatically in production, or expose the service-role key to
browser code.

## Manual end-to-end verification

Use a development or staging project with inboxes you control. Keep browser
developer tools and the Supabase table editor open while testing.

### Account, route protection, and project lifecycle

1. Visit `/signup`, create a new account, and complete the Supabase Auth email
   confirmation.
2. Sign in at `/login` and confirm the dashboard loads.
3. Sign out and request `/dashboard` directly. It should redirect to `/login`.
4. Sign back in, create the Kimchi project, and confirm a reserved slug and a
   duplicate slug are rejected.
5. Edit the project content, design, and settings. Wait for the saved state,
   reload, and confirm the edits persist.
6. Confirm desktop and mobile previews work and template switching preserves
   project content.
7. Confirm a draft returns not found at `/kimchi` but remains visible to its
   owner at `/preview/PROJECT_ID`.
8. Publish the project and confirm `/kimchi` loads. Unpublish it and confirm the
   public route returns not found without deleting subscribers or events.

### Public signup and duplicate safety

1. Publish Kimchi with email verification disabled for this first check.
2. Open `/kimchi` in a signed-out private browser window.
3. Submit a valid, unique email address.
4. Confirm the success view shows a position and project-specific referral URL.
5. In Supabase, confirm one subscriber row and one `signup` event were created.
6. Submit the same normalized email again.
7. Confirm it returns the existing position and referral code, creates no
   second subscriber, allocates no new position, and awards no second referral.
8. Submit an invalid email and an overlong custom answer. Both should return
   clear validation errors without raw database details.
9. Submit several different addresses concurrently and confirm each position
   is unique and sequential.

The signup operation is transactional in Postgres. Position allocation,
duplicate handling, referral validation, referral increments, and the signup
analytics event occur in the RPC rather than in separate browser writes.

### Referral attribution

1. Copy the first subscriber's `/kimchi?ref=CODE` URL.
2. Open it in a different private browser profile.
3. Confirm a valid `referral_visit` event is recorded and a project-scoped,
   signed, HTTP-only referral cookie is set.
4. Join with a different email.
5. Confirm the new subscriber's `referred_by` points to the first subscriber.
6. Confirm the first subscriber's `referral_count` increased exactly once and
   a `referral_signup` event exists.
7. Repeat the duplicate signup. The count must not increase.
8. Try the referrer's own email. Self-referral must not receive credit.
9. Try the code on a second project. Cross-project referral must not receive
   credit.
10. Enable project-level email confirmation and repeat with new addresses.
    Referral credit should be deferred until the referred subscriber confirms.

Check the one-, three-, and five-referral milestone display and the copy-link
and WhatsApp sharing actions. `share_click` analytics should never block
navigation.

### Email confirmation, welcome email, and unsubscribe

1. Configure Resend and enable "Require email confirmation" for Kimchi.
2. Join with a new deliverable address.
3. Confirm the subscriber initially has `pending` status.
4. Confirm the welcome email contains the project identity, position,
   confirmation link, referral link when enabled, milestones, and unsubscribe
   link.
5. Use the confirmation link once. Status should become `subscribed`; the same
   link should not be reusable.
6. Use the unsubscribe link. Status should become `unsubscribed` without
   exposing a database ID in an unsigned URL.
7. Confirm a project owner can resubscribe or remove the subscriber in the
   dashboard.
8. Temporarily use an invalid Resend key in staging and submit another signup.
   The signup should remain committed, the response should report
   `emailSent: false`, and the server log should contain a redacted delivery
   error.

Restore the valid key immediately after the negative test.

### Subscriber management and CSV

1. Open the project subscriber page.
2. Exercise search, status filtering, pagination, and sort controls.
3. Copy an email, change a subscriber status, and verify ownership enforcement.
4. Export CSV and confirm its exact columns are `email`, `name`, `status`,
   `position`, `referral_count`, `referred_by`, `utm_source`, `utm_medium`,
   `utm_campaign`, and `created_at`, populated from real subscriber data.
5. In a disposable test row, place `=`, `+`, `-`, or `@` at the start of a
   text value. Confirm the exported cell is neutralized before opening the CSV
   in spreadsheet software.
6. Sign in as a different owner and confirm that project data and exports are
   unavailable.

### Analytics and Demand Score

1. Open `/kimchi` in multiple private browser sessions and reload within one
   session.
2. Confirm page views count valid `page_view` events while unique visitors use
   distinct anonymous session IDs.
3. Follow a referral URL and submit a signup.
4. Open the project Analytics page and test 7-day, 30-day, 90-day, and all-time
   ranges.
5. Confirm totals, conversion, referral rate, signup and visitor series, traffic
   sources, UTM campaigns, referrers, devices, and available country values are
   derived from real database rows.
6. Confirm owner previews do not create normal public analytics.
7. Confirm no final Demand Score appears before 100 valid unique visitors.

To cross the Demand Score threshold in an isolated non-production project,
replace the UUID and run:

```sql
insert into public.events (
  project_id,
  event_type,
  session_id,
  metadata,
  created_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  'page_view',
  'demand-fixture-' || lpad(value::text, 4, '0'),
  '{"fixture":"demand-score"}'::jsonb,
  now() - ((100 - value) * interval '1 minute')
from generate_series(1, 100) as value;
```

Use the actual Kimchi project UUID. Refresh Analytics and confirm the score and
all four component values appear. Remove only those fixture events afterward:

```sql
delete from public.events
where project_id = '00000000-0000-0000-0000-000000000000'::uuid
  and metadata ->> 'fixture' = 'demand-score';
```

The deterministic score uses:

- 40% conversion quality
- 25% referral activity
- 20% signup volume
- 15% recent momentum

Each component is bounded from 0 to 100. Conversion reaches 100 at a 25%
visitor-to-signup rate, referral activity reaches 100 when 30% of signups are
valid referrals, signup volume uses a square-root curve that reaches 100 at 250
signups, and momentum compares the latest seven days with the prior seven
days. The final score remains hidden until 100 unique visitors exist.

### Asset upload

1. Upload a JPEG, PNG, WebP, or AVIF logo, hero image, product screenshot, or
   background image smaller than 5 MB.
2. Confirm the object path begins with the authenticated owner ID and project
   ID.
3. Confirm the editor receives a signed URL and the public project renders the
   image.
4. Try an SVG, an oversized file, a mismatched file signature, and a path from
   another owner. Each should be rejected.
5. Remove an uploaded image and confirm only the selected owned object is
   deleted.

## Production deployment

1. Import the repository into Vercel.
2. Keep the framework preset as Next.js. `vercel.json` selects the native
   production build command.
3. Confirm the project uses Node.js 22.x.
4. Add all environment variables to the appropriate Vercel environments.
5. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin without a trailing
   slash.
6. Add the final callback URL to the Supabase Auth redirect allow list.
7. Add the final hostname to the Turnstile widget.
8. Confirm the Resend sender domain is verified.
9. Apply every pending Supabase migration before sending traffic.
10. Deploy, then repeat the account, publish, signup, referral, email,
    analytics, CSV, and asset smoke tests against the production origin.

After any Vercel environment-variable change, redeploy. Existing deployments
do not receive newly added values automatically.

Official reference: [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables).

## Automated quality checks

Run every check from the repository root:

```bash
npm run lint
npm run typecheck
npm test
npm run build:vercel
npm run build
```

`npm run build:vercel` verifies the native Next.js production target.
`npm run build` verifies the preserved Vinext/Cloudflare target. Do not report a
provider integration as working solely because a build passes; complete the
external smoke tests as well.

## Troubleshooting

### "Authentication is not configured"

- Confirm both `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist.
- Confirm neither value contains surrounding quotes or accidental whitespace.
- Restart the local server after editing `.env.local`.
- Redeploy after changing Vercel variables.

### Account email returns to the wrong host

- Correct Supabase Auth Site URL.
- Add the exact `/auth/callback` origin to Redirect URLs.
- Confirm `NEXT_PUBLIC_SITE_URL` contains the intended origin.
- For a preview, confirm its hostname matches the narrowly scoped preview
  allow-list pattern.

### Missing relation, bucket, or RPC errors

- Run `supabase migration list`.
- Run `supabase db push --dry-run`, then `supabase db push`.
- Verify both RPC names and the private `project-assets` bucket with the SQL
  checks above.
- Confirm the app credentials point to the same project that received every
  migration.

### Public waitlist returns 404

- Confirm the project slug is normalized and is not a reserved platform route.
- Confirm the project status is `published`.
- Confirm required publish fields are valid.
- Draft and archived projects intentionally return not found publicly.

### Public signup returns HTTP 503

- Confirm `SUPABASE_SERVICE_ROLE_KEY` is present only on the server.
- Confirm `EMAIL_TOKEN_SECRET` contains at least 32 characters.
- In production, confirm both Upstash variables are configured.
- Inspect Vercel function logs for the redacted event name. Do not log or paste
  full tokens, passwords, subscriber payloads, or service-role keys.

### Turnstile always fails

- Configure the site key and matching secret from the same widget.
- Add the current hostname to the widget.
- Confirm the browser is not sending an expired or already-used token.
- Confirm Siteverify returns action `waitlist_signup`.
- Do not pair production keys with dummy tokens.
- In local bypass mode, ensure `NODE_ENV` is not `production`.

### Rate limiting is unavailable

- Use the Upstash HTTPS REST URL, not a Redis TCP URL.
- Use the standard read-write token, not the read-only token.
- Confirm both variables are available to the server runtime.
- Expect production public mutations to fail closed while Upstash is missing.

### Welcome or confirmation email does not arrive

- Confirm the Resend API key is active.
- Confirm `RESEND_FROM_EMAIL` uses the verified domain.
- Check SPF and DKIM status and the Resend delivery log.
- Check spam and suppression status for the recipient.
- Remember that a committed signup is not rolled back by email failure.
- If confirmation is required, resolve delivery before accepting production
  signups or users will remain pending.

### Asset upload fails

- Confirm the migrations created the private `project-assets` bucket and Storage
  RLS policies.
- Confirm the user owns the project.
- Use JPEG, PNG, WebP, or AVIF no larger than 5 MB.
- Do not use SVG or rename a non-image file to an accepted extension.

### Analytics is empty or Demand Score is hidden

- Confirm the project is published and the public route is generating
  `page_view` events.
- Confirm Upstash is configured in production.
- Use different browser sessions when testing unique visitors.
- Demand Score intentionally remains hidden below 100 distinct valid visitor
  session IDs.
- Country values depend on trusted deployment headers and may be unavailable
  locally.

### RLS denies an owner operation

- Confirm the user has a valid refreshed Supabase session.
- Confirm `projects.owner_id` equals the authenticated user UUID.
- Confirm the request uses the anonymous cookie-based client for owner actions.
- Never work around an owner-policy error by moving the service-role key into
  client code.

## External service references

- [Supabase CLI local development](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase database migrations](https://supabase.com/docs/reference/cli/supabase-projects-create#supabase-db-push)
- [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [Resend domains](https://resend.com/docs/dashboard/domains/introduction)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/)
- [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi)
