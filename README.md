# LaunchBeam landing page

Light-mode marketing site and functional product prototype for LaunchBeam, a
waitlist and demand-validation platform for early-stage founders.

## Included

- Argentum Sans-first marketing system with a monochrome liquid-glass treatment
- Local Argentum Sans Regular, Medium, and SemiBold WOFF2 files, distributed
  under the included SIL Open Font License
- Connected Kimchi product demo with editable copy, three distinct template
  directions, desktop/mobile preview controls, and an analytics view
- Mathematically consistent example campaign data, clearly labelled throughout
- Demand Score dashboard with Overview, Sources, and Referrals tabs
- Two beta pricing plans, six accessible FAQs, and an honest private-beta signal
- Responsive navigation with focus trapping, Escape handling, and reduced motion
- Native smooth anchor navigation with fixed-header offsets and progressive,
  reduced-motion-safe section reveals
- Host-aware canonical, Open Graph, X, favicon, and structured-data metadata
- Private-beta request form backed by the existing Cloudflare D1 and Drizzle stack

The page builder, template controls, example waitlist form, and analytics are
local prototype interactions. Authentication, project publishing, production
analytics collection, referrals, custom domains, billing, and checkout are not
active yet. The site does not imply otherwise.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run db:generate
```

The Sites build packages migrations from `drizzle/`. A local D1 preview must
have the generated migration applied before a valid beta request can be stored.

## Deployment targets

- `npm run build` builds the existing Vinext/Cloudflare Sites deployment.
- `npm run build:vercel` runs the native Next.js build used by Vercel.
- `vercel.json` pins the Vercel framework preset and build command so dashboard
  overrides cannot accidentally invoke the Cloudflare build.

The marketing site and local prototype run on either target. Beta signup
storage currently requires the Cloudflare D1 binding; on Vercel the endpoint
returns a temporary-unavailable response until a Vercel-compatible database
adapter and credentials are configured.
