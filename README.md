A self-service CMS + customer portal for a freight forwarder. Like
WordPress, **one deployment = one freight forwarder**: install this app
once per company (its own folder, its own port/URL), set that company's
`TENANT_API_KEY` in `.env` (see "Registering a new freight forwarder"
below), and its admin can customize branding without touching code.

Many such deployments — one per company — can safely share the exact
same Postgres database, because every table this app owns is scoped by
`companyId` (see "Data ownership" below). Copying this folder, giving the
copy its own port and its own `TENANT_API_KEY`, is the normal way to run
a second company's portal locally or in production; `../api` is the
single hub every deployment reads and writes its shared data through.

It has **no database connection of its own** — every read and write,
including to the data it conceptually "owns" (branding, rates, driver
assignments, and so on), goes through `../api`'s REST endpoints via a
small hand-written `fetch()` wrapper (`src/lib/apiClient.ts` — plain
HTTP, no shared client library between apps). `../admin` owns the
database schema; `../api` is the sole process every client app, including
this one, actually calls; this app is otherwise fully independent, with
its own `package.json` and `node_modules`.

## Roles

| Role | Access |
| --- | --- |
| **Admin** | Customize this instance's branding/CMS content (`/admin/settings`); manage weight-based shipping rates (`/admin/rates`); manage branch locations (`/admin/locations`); manage the public FAQ accordion (`/admin/faqs`); schedule and review manifests (`/admin/manifests`, schedule in `/admin/settings`); manage CSR & Driver accounts (`/admin/users`); browse every package for this tenant (`/packages`); everything CSR and Driver can do. |
| **CSR** | Look up any of this tenant's shipments by tracking number or customer email (`/csr`); browse every package for this tenant (`/packages`), for support purposes. |
| **Customer** | Self-registers (`/signup`); sees their own shipments (`/my-shipments`), auto-matched by their account email against the `Customer` record in the shared database. |
| **Driver** | Sees shipments assigned to them for delivery (`/driver`) and advances their status (assigned → out for delivery → delivered/failed); `/packages` shows the same assigned packages in a plain read-only list. |

Anyone, logged in or not, can look up a single shipment by tracking
number on the public homepage (`/`) — the original public tracking
feature, now with this tenant's branding — and see the shipping rates
table with a live weight-based cost calculator, both driven entirely by
what the admin has configured at `/admin/rates`.

The homepage hero is full viewport height, with either the default
gradient or a background image the admin uploads at `/admin/settings`
(JPEG/PNG/WebP/GIF, up to 8MB — stored as bytes on a `PortalSettings` row
in the shared database and served back through this app's own
`/api/branding/hero-image` proxy route; replacing or removing an image
overwrites/clears those bytes, there's no file on disk anywhere).

## Data ownership

`../admin` owns every table's schema — there is no schema file, no
migration, and no direct database access anywhere in this app. What used
to be a split between "tables this app owns" and "tables it reads
read-only" is now just a split in which parts of `../api`'s REST surface
(`src/app/api/v1/**` there, called here through `src/lib/apiClient.ts`)
each feature calls:

1. **Data `../admin`'s Packages UI also manages** — `Package`, `Company`,
   `Customer`. Generating a manifest bulk-updates `Package.status` from
   `RECEIVED` to `SHIPPED` on the packages it captures (server-side, inside
   `../api`'s own `generateManifest()`); `/packages` has a role-scoped edit
   modal (Admin: every field, including reassigning the customer; CSR:
   status/weight/pieces/customer/rate/cost; Driver: status only) — see
   `editablePackageFields` in `lib/rbac.ts` — and `/signup` has `../api`
   create a matching `Customer` row (scoped to this tenant) if none already
   exists for that email, so a self-registered customer immediately shows
   up in admin's Packages/CSR customer directory and can be assigned
   packages.
2. **Data only this app's UI manages** — portal user accounts (auth, all 4
   roles; also the target of one write going the *other* direction — see
   "Registering a new freight forwarder" below, where `../admin` creates
   the initial ADMIN account directly), portal settings (the CMS branding,
   one row per company — also holds the manifest auto-generation
   schedule), shipping rates (admin-configurable weight-based pricing
   tiers), locations (admin-configurable branch locations — name, address,
   contact number, Mon–Fri/Sat hours; active ones populate the "Preferred
   store location" dropdown on the signup form), manifests (a point-in-time
   snapshot of every `RECEIVED` package at generation time, plus how it was
   triggered), FAQs (admin-managed Q&A pairs — active ones render as an
   accordion on the public homepage), and delivery assignments (driver
   assignments — separate from `Package.status`, which otherwise stays
   admin-Packages-owned).

Every one of those `../api` routes scopes its query by companyId,
resolved from the `x-api-key` header each call carries — this is what
makes it safe for many single-tenant deployments to share one physical
database and one `../api` process: each deployment's `TENANT_API_KEY`
(used as both the tenant identifier and the API credential — see
`getTenantCompanyId()` in `lib/tenant.ts` and `../api/src/lib/internalAuth.ts`)
only ever resolves to that one company, never another deployment's.

Manifests can be generated manually (`/admin/manifests` → Generate now)
or on a schedule configured in `/admin/settings` (a time and a subset of
weekdays, in the server's local time) — an in-process scheduler started
once per server via `src/instrumentation.ts` checks every 30s and fires
at most once per matching minute, calling `../api`'s
`v1/manifests/generate` endpoint. Either way, generating a manifest
snapshots every currently-`RECEIVED` package for this tenant and advances
them to `SHIPPED`; the snapshot is kept even if the underlying packages
later change status again, so a manifest always reflects what was
actually manifested at the time.

If you need a schema change (a new field on any of the above), it goes
through `../admin/prisma/schema.prisma` and its migrations, then a
matching route/type update in `../api` — see the root README's "Adding a
schema change" — never anything in this app.

## Setup

1. Install dependencies — this app has its own `package.json`, unrelated
   to any other app in the repo:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set `ADMIN_API_URL` to wherever
   `../api` is running (`http://localhost:3010` locally), and
   `TENANT_API_KEY` to the key issued for this company — see "Registering
   a new freight forwarder" below.

3. Start `../api` first (it must be reachable at `ADMIN_API_URL`, since
   this app has no database of its own — see its README), then start this
   app's dev server (port 3001):

   ```bash
   npm run dev
   ```

   Visit http://localhost:3001.

## Registering a new freight forwarder

There's no seed script — every deployment, including your first one, goes
through this same onboarding path:

1. In `../admin` (Service-Provider), create the company under Companies.
   This automatically:
   - generates its `TENANT_API_KEY`;
   - creates a `PortalUser` row (ADMIN role, `mustChangePassword` set) for
     the company's contact email;
   - emails that contact a one-time password and the API key via Resend
     (or, if `RESEND_API_KEY` isn't configured in `../admin`, logs both to
     the server console and shows them in the admin UI instead).
2. Set `TENANT_API_KEY` to that value in this deployment's `.env` (a fresh
   copy of this folder, or this one if it's the first company) and
   (re)start the server. Every login, shipment lookup, and CMS setting is
   scoped to whatever company that key resolves to; without a valid one
   set, this deployment shows a graceful "not configured" error
   everywhere instead of functioning.
3. Sign in at `/login` with the registered email and the one-time
   password. You're forced straight to a "set a new password" page before
   anything else works — after that you're signed out and need to log in
   again with the real password.

To rotate a leaked key: regenerate it in the Service-Provider app
(Companies → Regenerate), then update `TENANT_API_KEY` in this
deployment's `.env` and restart — the old key stops resolving immediately.

## Running a second company's portal locally

Copy this folder anywhere in the repo root (see `customer-portal-bhf/` and
`customer-portal-ids/` for existing examples), give it a unique `name` in
`package.json`, run its own `npm install`, point its `.env` at the same
`ADMIN_API_URL` with its own `TENANT_API_KEY` (from a different company
registered in Service-Provider), and give it its own port (`"dev": "next
dev -p 3002"` in `package.json`, and update `NEXTAUTH_URL` in its `.env`
to match). Both copies call the same `../api` instance safely — see "Data
ownership" above.
