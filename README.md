# LaunchBeam

LaunchBeam is a functional multi-tenant waitlist and demand-validation SaaS for
early-stage founders. It preserves the original polished marketing site and
Kimchi product demonstration while connecting authenticated projects to real
Supabase data.

## Product capabilities

- Supabase email/password accounts with cookie-based sessions and protected
  dashboard routes
- Draft project creation, slug validation, autosaving editor, owner preview,
  publishing, and unpublishing
- Five shared responsive templates: Minimal Beam, Kimchi, Kevinora, Spotbeam,
  and Darkrai
- Public project pages at `/<slug>` with project metadata and a Kimchi default
- Transaction-safe public signups with duplicate-safe positions
- Project-scoped referral links, signed attribution cookies, referral counts,
  and milestone progress
- Optional subscriber email confirmation, welcome email, and signed
  unsubscribe links through Resend
- Real page-view, signup, referral, source, campaign, device, and available
  country analytics
- A deterministic Demand Score after 100 unique visitors
- Subscriber search, filtering, status management, deletion, and safe CSV
  export
- Private Supabase Storage uploads for JPEG, PNG, WebP, and AVIF project assets
- Cloudflare Turnstile validation and Upstash Redis rate limiting for public
  endpoints

The interactive Kimchi campaign embedded in the marketing page remains clearly
labelled sample data. Projects created by signed-in users use real subscribers,
events, referrals, exports, and publishing state.

## Architecture

- Next.js App Router and React for marketing, auth, dashboard, editor, preview,
  public waitlists, and route handlers
- Supabase Auth, Postgres, Row Level Security, RPC transactions, and Storage
- Zod validation at server boundaries
- Owner-scoped browser/server clients and a lazy server-only service-role client
- Server-only Resend, Turnstile Siteverify, Upstash, and signed-token helpers
- Shared template rendering across editor preview, owner preview, and public
  pages

Anonymous clients can read only published projects. Public signup and analytics
writes go through validated, rate-limited server endpoints; anonymous browsers
cannot write directly to subscriber or event tables. The database migration is
the final integrity layer for ownership, slug uniqueness, duplicate signups,
position allocation, and referral credit.

## Quick start

```bash
npm ci
```

Copy `.env.example` to `.env.local`, configure Supabase, and apply
`supabase/migrations/0001_launchbeam.sql`. Then run the native Next.js target:

```bash
npm run dev:vercel
```

Open [http://localhost:3000](http://localhost:3000).

The complete provider setup, migration, Auth URL configuration, Kimchi seed,
deployment instructions, acceptance tests, and troubleshooting guide are in
[docs/SETUP.md](docs/SETUP.md).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run dev:vercel
npm run build:vercel
npm run start:vercel
npm run lint
npm run typecheck
npm test
npm run db:generate
```

- `dev:vercel`, `build:vercel`, and `start:vercel` are the canonical native
  Next.js/Vercel SaaS commands.
- `dev`, `build`, and `start` preserve the Vinext/Cloudflare Sites target used
  by the existing landing-page workflow.
- `db:generate` maintains the preserved Drizzle/D1 fallback for marketing-page
  beta requests. Configured SaaS deployments store those requests in Supabase,
  whose schema is versioned under `supabase/migrations/`.

## External services

Production requires Supabase, a 32+ character `EMAIL_TOKEN_SECRET`, Cloudflare
Turnstile, and Upstash Redis. Resend is required for welcome email and for any
project that enables subscriber email confirmation.

External clients are initialized lazily so missing credentials do not break a
build. Runtime behavior is intentionally stricter: public signup and analytics
fail closed in production if their required security services are absent.

## MVP boundaries

LaunchBeam does not currently include billing, checkout, arbitrary custom HTML,
arbitrary JavaScript or CSS, custom domains, email broadcasts, workflow
automation, or a plugin marketplace. The schema and project model are designed
so plans and additional delivery features can be introduced later.
