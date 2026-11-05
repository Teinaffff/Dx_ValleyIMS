# DxValley Innovation Management System

A production-quality innovation management platform for DxValley Innovation Hub. It combines a public digital product showcase with an internal admin workspace for running ideas, products, milestones and stage gates.

The visual language follows the supplied brand reference: soft periwinkle canvas, floating white cards, tight display headlines, royal-blue pill actions and dark navy feature panels.

## Stack

- **Web:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Radix/shadcn-style primitives, Lucide, TanStack Query, React Hook Form, Zod, Recharts
- **API:** NestJS 11 REST, Prisma 6, PostgreSQL 16, JWT access/refresh tokens in httpOnly cookies
- **Shared:** `@ims/shared` workspace package for lifecycle constants, permission catalog, Zod schemas and API types
- **Tooling:** npm workspaces, Jest-ready API test setup, Docker/Nginx-ready configuration planned for a later phase

## Repository layout

```
apps/
  api/                 NestJS API, Prisma schema, migration and seed
  web/                 Next.js public showcase and admin workspace
packages/
  shared/              Shared lifecycle, RBAC, schemas and TypeScript contracts
.env.example           Environment template for both apps
```

## Prerequisites

- Node.js 20+ (built with Node 24)
- PostgreSQL 16+ running locally on port 5433 (this workspace is configured for PostgreSQL 18)
- npm 10+

## Local setup

1. **Create the database role and database**

   ```bash
   psql -h 127.0.0.1 -p 5433 -U postgres -c "CREATE ROLE ims LOGIN PASSWORD 'ims_dev_password' CREATEDB;"
   psql -h 127.0.0.1 -p 5433 -U postgres -c "CREATE DATABASE dxvalley_ims OWNER ims;"
   ```

   `CREATEDB` is required because Prisma Migrate creates a shadow database.

2. **Install dependencies**

   ```bash
   npm ci
   ```

3. **Configure environment files**

   Copy the values from `.env.example` into:

   - `apps/api/.env` — database, port, JWT secrets, cookie settings
   - `apps/web/.env.local` — `API_URL` and `NEXT_PUBLIC_APP_NAME`

   Both are already present in this local workspace. Change the JWT secrets and set `COOKIE_SECURE=true` before deploying.

4. **Create the schema and seed reference data**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   `npm run db:seed` writes reference data only — roles, permissions, stage templates and default settings. It never deletes existing rows and never creates a shared demo password.

   Create your first administrator by giving it real credentials (the password is only used when the account does not exist yet; an existing account's password is never overwritten):

   ```bash
   SEED_ADMIN_EMAIL=you@dxvalley.com SEED_ADMIN_NAME="Your Name" SEED_ADMIN_PASSWORD='at-least-12-characters' npm run db:seed
   ```

   ```powershell
   # PowerShell
   $env:SEED_ADMIN_EMAIL = "you@dxvalley.com"; $env:SEED_ADMIN_PASSWORD = "at-least-12-characters"; npm run db:seed
   ```

   The seed requires `@ims/shared` to be built first. The workspace scripts handle this for `npm run dev`; for a manual seed after a clean checkout run:

   ```bash
   npm run build -w @ims/shared
   npm run db:seed
   ```

5. **Start both apps**

   ```bash
   npm run dev
   ```

   - Public showcase: <http://localhost:3000>
   - Admin workspace: <http://localhost:3000/admin/dashboard>
   - API: <http://localhost:4000/api>
   - Health check: <http://localhost:4000/api/health>

   `npm run dev` builds the shared package first, then starts the API and web app together.

## Demo workspace (opt-in)

Fake accounts, products, ideas and milestones are only created when you ask for them. This resets every table first, so never run it against data you care about:

```bash
npm run db:seed:demo    # or: SEED_DEMO=1 npm run db:seed
```

All demo accounts share the password `Password123!`.

| Role | Email | Can access |
| --- | --- | --- |
| Administrator | `admin@dxvalley.dev` | Full admin workspace, all products, governance views |
| Product Owner | `owner@dxvalley.dev` | Own products, portfolio, stage-gate readiness |
| Product Owner | `owner2@dxvalley.dev` | Own products, portfolio, stage-gate readiness |
| Product Owner | `owner3@dxvalley.dev` | Own products, portfolio, stage-gate readiness |
| Product Owner | `owner4@dxvalley.dev` | Own products, portfolio, stage-gate readiness |
| Evaluator | `evaluator@dxvalley.dev` | Assigned stage-gate reviews |
| Evaluator | `approver@dxvalley.dev` | Assigned stage-gate reviews |

These credentials are for local development only and are refused when `NODE_ENV=production` unless `SEED_DEMO_CONFIRM=1`. Never use sample credentials in production.

## What is implemented in this checkpoint

### Foundation

- npm-workspaces monorepo with shared, API and web packages
- Prisma schema covering users, roles, permissions, teams, products, milestones, stage history, stage-gate requests and decisions, ideas, challenges, submissions, notifications, stage templates, public updates, followers and audit logs
- Initial migration and a deterministic seed: 7 users, 4 teams, 8 products across all six stages, milestones, gate requests, ideas, challenges, updates and audit activity
- Shared design system: tokens, Tailwind theme, typography, surfaces, cards, buttons, badges and lifecycle accents
- Deterministic product health: `COMPLETED`, `BLOCKED`, `AT_RISK`, `ON_TRACK`

### Authentication and RBAC

- NestJS JWT access and refresh tokens stored in httpOnly cookies (`ims_at` on `/`, `ims_rt` on `/api/auth`)
- Global JWT guard and permissions guard; `@Public()` and `@RequirePermissions()` decorators
- Permission catalog shared between API and web (`product.view.all`, `product.create`, `milestone.manage`, `gate.decide`, `audit.view`, and so on)
- Server-side enforcement: unauthenticated requests receive `401` from product and dashboard APIs; product owners are scoped to their own products
- Next.js middleware protects `/admin`, validates the real session in the admin layout, and redirects unauthenticated visitors to `/login`
- Safe `next` redirect handling, password hashing with bcryptjs, login throttling and Helmet security headers

### Admin workspace

- Grouped navigation shell with global search, live notifications menu, profile menu and mobile drawer
- Dashboard with six live KPIs, pipeline distribution, recent products, pending stage gates, activity feed and approval-policy callout
- Product portfolio with server-side search, stage/owner/team/health filters, sorting, pagination and archived-product toggle
- Create and edit product dialogs using React Hook Form + Zod, including starter milestone templates, visibility scopes and owner assignment
- Product detail workspace: lifecycle tracker, milestone progress, stage readiness, stage history, edit, archive/restore and public-view link
- Pipeline view grouped by stage, stage-gate approval queue with approver decision progress and policy labels
- User directory with validated account creation (name, email, job title, role, temporary password and team membership) and audit logging; teams remain read-only in this checkpoint
- Idea inbox showing every submission with submitter contact details, status, problem, proposed solution and expected impact; evaluation actions remain Phase 3
- Placeholder workspaces for milestone management, challenges, analytics, roles, audit logs and settings so navigation is complete and honest about scope

### Public showcase

- Reference-led landing page: hero, floating product card, approval card, stats strip, six-stage journey rail, filterable portfolio, navy idea CTA and footer
- Public product detail with journey, milestone progress, public updates, product facts, owner contact and related links
- Public idea form with no account or sign-in required; submissions capture contact details, create a notification for every administrator and appear in the admin idea inbox
- Public challenges page backed by the live API, including deadlines, eligibility, criteria and submission counts
- Role-aware header/footer with staff sign-in only where an account is actually needed
- Public API sanitisation: internal ideas, approval notes, stage reasons, visibility team IDs and creator email are never exposed

## Lifecycle and stage-gate model

The lifecycle is fixed and ordered:

`IDEATION → VALIDATION → MVP → PILOT → SCALE → MONETIZATION`

- Every product is in exactly one stage.
- Required and optional milestones are generated from stage templates when a product is created.
- Completing milestones never moves a product on its own.
- A stage-gate request collects independent decisions from two or three approvers.
- The configured policy (unanimous by default, majority configurable) determines the outcome.
- Rejections and revision requests block progression; decisions are append-only.
- Only an administrator can move a product backwards, and only with a recorded reason.
- Every transition is written to stage history and the audit log.

The database, seeded data, readiness preview and approval queue are in place. Gate submission and decision capture are wired in the stage-gate phase; the UI deliberately disables the submission button until then rather than faking progression.

## API surface (first checkpoint)

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/api/health` | Public |
| `POST` | `/api/auth/login` | Public, throttled |
| `POST` | `/api/auth/refresh` | Public, refresh cookie |
| `POST` | `/api/auth/logout` | Public |
| `GET` | `/api/auth/me` | Authenticated |
| `GET` | `/api/dashboard` | Admin or analyst permissions |
| `GET` | `/api/products` | Scoped by role |
| `GET` | `/api/products/meta` | Admin / product owners |
| `POST` | `/api/products` | `product.create` |
| `GET` | `/api/products/:id` | Scoped by role |
| `PATCH` | `/api/products/:id` | Owner or admin |
| `POST` | `/api/products/:id/archive` | `product.archive` |
| `POST` | `/api/products/:id/restore` | `product.archive` |
| `GET` | `/api/products/:id/history` | Scoped by role |
| `GET` | `/api/users` | `user.manage` |
| `POST` | `/api/users` | `user.manage` |
| `GET` | `/api/ideas` | `idea.view` |
| `GET` | `/api/notifications` | `notification.view` |
| `POST` | `/api/notifications/:id/read` | `notification.view` |
| `POST` | `/api/notifications/read-all` | `notification.view` |
| `GET` | `/api/teams` | `team.manage` or product visibility |
| `GET` | `/api/public/portfolio` | Public |
| `GET` | `/api/public/products/:slug` | Public |
| `GET` | `/api/public/challenges` | Public |
| `POST` | `/api/public/ideas` | Public, throttled |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Build shared, then run API and web together |
| `npm run dev:api` / `npm run dev:web` | Run one app |
| `npm run build` | Production build for shared, API and web |
| `npm run typecheck` | Build shared, then typecheck API and web |
| `npm run db:migrate` | Create and apply a Prisma migration |
| `npm run db:seed` | Seed reference data (roles, permissions, stage templates, settings) and, with `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, the first administrator |
| `npm run db:seed:demo` | Opt-in demo workspace — wipes all data, then seeds fake users/products (dev only) |
| `npm run db:reset` | Reset the database, then seed reference data |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | API Jest suite (scaffolding in place) |

## Phase checklist

- [x] Phase 0 — Monorepo, shared package, design tokens, PostgreSQL, Prisma schema, migration and seed
- [x] Phase 1 — Authentication, httpOnly cookie sessions, RBAC guards, admin route protection
- [x] Phase 2 — Admin shell, live dashboard, product portfolio, product create/edit/archive, product detail, pipeline, approvals queue, users (directory + account creation) and teams
- [x] Public showcase — Landing page, public product detail, public challenges, account-free idea submission
- [x] Idea intake — Anonymous submissions, administrator notifications, live notification bell and read-only idea inbox
- [ ] Phase 3 — Idea evaluation, clarification, assignment and conversion into products
- [ ] Phase 4 — Project and milestone management, evidence capture, blockers
- [ ] Phase 5 — Stage-gate submission and decision capture, users/roles/audit/settings
- [ ] Phase 6 — Challenge management and analytics
- [ ] Later — Automated tests, Docker Compose, Nginx, production hardening

## Security notes

- Permissions are enforced by API guards, not by hiding interface elements.
- Product detail responses are sanitised before being exposed publicly.
- Login is rate-limited; passwords are hashed with bcryptjs.
- The public idea endpoint is validated and rate-limited per IP. It never creates an account and never exposes submission content publicly; only authenticated users with `idea.view` can list ideas.
- In-app notifications are scoped to the signed-in user, and marking one read only affects that user's copy.
- Cookies are `httpOnly` and `SameSite=Lax`; set `COOKIE_SECURE=true` and rotate both JWT secrets for any non-local environment.
- Audit data is append-only by design; do not expose mutation endpoints for audit records.
- Sample accounts and secrets in this repository are development-only.

## Troubleshooting

- **`Environment variable not found: DATABASE_URL`** — Prisma only loads `apps/api/.env`. Run database scripts through the workspace (`npm run db:migrate`) or supply `DATABASE_URL` explicitly.
- **Prisma `P3014` shadow database error** — grant `CREATEDB` to the `ims` role.
- **`@ims/shared` cannot be resolved** — run `npm run build -w @ims/shared` before typechecking or seeding.
- **Login appears to succeed but admin redirects to sign-in** — ensure the API `JWT_SECRET` matches the secret used by the JWT module and restart the API after changing env values.
