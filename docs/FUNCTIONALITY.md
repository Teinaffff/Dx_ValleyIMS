# DxValley IMS — Functionality Documentation

_Last updated: 2026-11-03. Scope: everything currently implemented in `apps/web` + `apps/api`._

## 1. System Overview

| Layer | Technology |
|---|---|
| Web (portals) | Next.js 15 App Router, React 19, TypeScript, Tailwind, TanStack Query, Recharts |
| API | NestJS 11, Prisma 6, PostgreSQL |
| Auth | JWT in httpOnly cookies (`ims_at` access 8h, `ims_rt` refresh 7d, rotated on refresh) |
| Security | Global throttling (300 req/min), stricter on login (10/min) & idea submission (10/min), server-side RBAC on every endpoint, immutable audit log |

**Roles:** `ADMIN` (bypasses all permission checks), `EVALUATOR`, `PRODUCT_OWNER`.
Permissions are granular codes (`product.create`, `product.update`, `product.archive`, `product.delete`, `product.view.all`, `product.view.own`, `milestone.manage`, `idea.view`, `user.manage`, `team.manage`, `notification.view`, `audit.view`), assigned to roles in the database. **All enforcement is server-side** — the UI hiding a button is never the protection.

There are two portals:

1. **Public Product Portal** (`/`, `/products/[slug]`, `/submit-idea`) — no login required.
2. **Admin Portal** (`/admin/*`) — login required; every authenticated user has a workspace role and is redirected here after sign-in.

---

## 2. Public Product Portal (no sign-in)

### 2.1 Landing page `/`
Server-rendered from `GET /api/public/portfolio`.

- **LandingHero** — live stats bar (total live products, active teams, "Stage-gated delivery"), headline, CTAs ("Explore the portfolio", "Submit an idea"), animated floating icon chips, orbit rings, and a **"Live from the portfolio"** stack of the 3 most recent products (owner, stage, milestone %) linking to product pages. Also reused (compact variant) on the `/login` right panel.
- **JourneyStepper** — the six lifecycle stages as a connected flow: checkmark for passed stages, highlighted focus stage (the one with the most live products), filled connector line, per-stage live counts. Horizontal on desktop, vertical timeline with summaries on mobile. Each stage links to the portfolio section.
- **Portfolio explorer** — client-side search across name/description/owner/team, filters for stage, team, business area, live result count, clear-filters, empty state. Renders product cards: stage label, health badge, name, description, owner avatar + team, days in stage, milestone %, "View product" pill (whole card is a link).
- **Idea CTA banner** — dark panel pushing anonymous idea submission, with a decorative "From idea to product" checklist card.

### 2.2 Public product detail `/products/[slug]`
Server-rendered from `GET /api/public/products/:slug`.

- Header: stage accent styling, stage + health badges, days-in-stage, name, description, owner, teams, business area, follower count, "Contact owner" (opens an owner details dialog with copy-email and an explicit "Open mail app" action).
- **StageTracker** — visual position across the six stages with stage history.
- **Milestones** — required-completed/total progress bar + read-only milestone list.
- **Product updates** — dated news timeline (latest flagged).
- Sidebar: "Product facts" (area, target users, expected impact, launch target, owner, teams, in-portfolio-since), navy "Have context to share?" card, links back to portfolio / submit an idea.

### 2.3 Submit an idea `/submit-idea`
- Anonymous form (react-hook-form + zod) → `POST /api/public/ideas` (throttled 10/min).
- Fields: name, work email, job title (optional), idea title, problem, proposed solution, expected impact (optional).
- Success screen shows a **REFERENCE code**, with "Share another idea" / "Explore the portfolio".
- 3-step explainer (Describe → Evaluation → Product journey) + "no sign-in needed" trust note.
- Submission instantly appears in the **admin idea inbox** and triggers an admin notification.

### 2.4 Session-aware chrome
- Signed-in visitors see their avatar with a dropdown (Submit an idea, Admin workspace, Sign out) instead of public CTAs. No sign-in buttons are shown to anonymous visitors; portal users navigate directly to `/login`.

---

## 3. Admin Portal (`/admin/*`, login required)

Shell: sidebar grouped into **Workspace / Organisation / Governance**, global search (routes to products), notifications bell (60s polling, unread badge, mark read/all-read), profile menu with "Public portal" link and sign-out. Middleware redirects unauthenticated hits to `/login?next=…`.

### 3.1 Dashboard `/admin/dashboard`
- Time-based greeting; buttons "Open portfolio" and "New product" (auto-opens the create dialog via `?new=1`).
- 6 KPI cards: ideas, active products, MVP/pilot count, scale count, pending approvals, success rate.
- 6 pipeline cards (one per stage) with stage-order chevron strip, linking to the filtered portfolio.
- **Recently updated** products table (stage badge + mini stage tracker, owner, milestone progress, health, updated).
- **Pending approvals** list with count badge.
- Activity feed of recent movements; "Pipeline pulse" distribution bars + reminder card.

### 3.2 Idea inbox `/admin/ideas`
- Stat cards: ideas in inbox, awaiting review, approved.
- Status tabs with live counts: **All** (excludes deleted), **Pending**, **Approved**, **Deleted**.
- Search by title, submitter name/email or reference code; sort newest/oldest. Status, search and sort are stored in the URL so a view can be shared or refreshed.
- Pending ideas: **Approve** (optional review note) and **Delete** (optional reason, confirmation dialog).
- Approved ideas: **Delete**; approval metadata (who, when, note) is shown on the card.
- Deleted ideas: **Restore** returns the idea to the pending queue; deletion is a soft delete and never removes the row.
- Every approve, soft-delete, restore and return-to-pending writes to the immutable audit log.
- Approve = `idea.approve`, delete = `idea.delete`, restore = `idea.restore`. Actions are hidden in the UI when the session lacks the permission, but the API enforces the same rules regardless.

### 3.3 Innovation pipeline `/admin/pipeline`
- Six stage sections (number, label, summary, count, "Filter portfolio" link).
- Product cards per stage (owner, health, milestone progress) linking to detail.

### 3.4 Product portfolio `/admin/products`
- **Create product** dialog (admin or `product.create`): details + owner + multiple development teams + optional starting milestones + visibility. Milestones are never generated automatically.
- Filters: search, stage, owner, team, health, sort (updated/created/name), show-archived toggle, filter count, clear.
- Table (desktop) / cards (mobile): restore action for archived rows; per-row actions dropdown — Open, Archive, Restore, **Delete permanently** (admin-only danger dialog listing what will be lost).
- Pagination preserving filters; empty state with clear action.

### 3.5 Product detail `/admin/products/[id]`
- Archived banner; badges (stage, health, visibility, archived).
- Actions by permission: **Edit product** (owner, teams, visibility + per-team visibility, business area, target users, impact, launch target), Archive/Restore (admin), Delete (admin, then back to list), **Submit for {next stage}** (owner or admin).
- StageTracker; product context grid (incl. "Converted from idea …" origin when applicable).
- **Milestones**: all six lifecycle stages are listed, even when empty. The product owner (or an admin) can add, edit, complete/reopen and delete milestones in the current and upcoming stages. Completed stages are read-only, and every milestone action is locked while a stage-gate request is pending. Evaluators and other viewers see milestones read-only. Each milestone supports an owner, due date, evidence link, required flag and optional target/actual/unit.
- **Stage-gate submission dialog**: server-computed readiness checklist (product active, next stage exists, no pending request, no blocking health, all required current-stage milestones complete), sticky "Ready / Not ready" badge, policy chips (mode, approver count), the eligible reviewer names the API will assign, and an optional note. Evidence links are optional metadata and never block submission. Submitting is disabled until the API marks the product ready. The button becomes an "Awaiting {stage} approval" chip while a request is pending.
- **Stage-gate panel**: shows the pending request (round, decisions recorded, reviewers still to decide) alongside the readiness checklist and explainer.
- **Stage-transition history** timeline (from → to, date, moved by, reason).
- Quick links: milestones, approvals, public view.

### 3.6 Stage gate approvals `/admin/approvals`
- Pending stage-gate requests: product link, from→to stages, submitted date, notified reviewer avatars, "Awaiting decision · N reviewers notified · Any evaluator decides", owner, and a **Review & decide** action for evaluators/admins.
- **Decision dialog**: submitted round and note, current readiness checks, notified reviewers, decision note, and Park / Reject / Approve & advance actions. Rejections require a written reason. Approving advances the product one lifecycle stage and appends a `StageHistory` entry; rejecting keeps it in place; parking sets the product status to PARKED.
- Any authenticated user with `gate.decide` (evaluators and admins) can decide, even if they were not one of the notified reviewers. Owners and submitters cannot decide on their own gate unless the policy allows self-approval.
- "How a gate is decided" explainer + default policy card (single evaluator decision; rejection requires written reason).
- Submissions arrive here automatically (one pending request per product, unique partial index) and create a `gate.review` notification for every assigned reviewer; decisions notify the owner, submitter and other reviewers with `gate.approved` / `gate.rejected` / `gate.parked`.

### 3.7 Teams `/admin/teams` — read-only
Team cards: initials, product count, description, member avatar stack, team lead (crown icon), member/product counts. No create/edit UI yet (API exists).

### 3.8 User management `/admin/users`
- Stat cards: people, active, product owners.
- **Add user** dialog (needs `user.manage`): full name, job title, email, role select with description blurbs (ADMIN / EVALUATOR / PRODUCT_OWNER), temporary password with show/hide, team chips → `POST /api/users`.
- Table/cards: avatar, email, title, role badge, team chips, owned-product count, Active/Inactive, joined date. Read-only otherwise (API supports update; UI not built).

### 3.9 Notification centre
Bell in the shell: unread badge (9+ cap), per-notification read on click, "Mark all read"; idea submissions notify admins; stage-gate submissions notify reviewers and gate decisions notify the owner, submitter and other reviewers — all in-app.

### 3.10 Placeholder pages (planned, not functional)
`/admin/milestones`, `/admin/roles`, `/admin/audit-logs`, `/admin/settings`, `/admin/analytics` — each shows its planned feature list.

---

## 4. API Surface (`/api/*`)

| Module | Endpoints | Access |
|---|---|---|
| Health | `GET /health` | public |
| Auth | `POST /auth/login` (10/min), `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | login/refresh public; `me` any user |
| Public | `GET /public/portfolio`, `GET /public/products/:slug`, `POST /public/ideas` (10/min), `GET /public/challenges` | public |
| Users | `GET /users`, `POST /users`, `PATCH /users/:id`, `GET /users/owners` | `user.manage` (owners needs `product.create`) |
| Teams | `GET /teams`, `POST /teams`, `PATCH /teams/:id` | list = any user; write = `team.manage` |
| Products | `GET /products` (+query), `GET /products/meta`, `POST /products`, `GET /products/:id`, `PATCH /products/:id`, `POST /products/:id/archive`, `POST /products/:id/restore`, `DELETE /products/:id`, `GET /products/:id/history` | visibility-scoped (`view.all`/`view.own`); write per permission |
| Milestones | `GET /products/:id/milestones` (+stage), `POST /products/:id/milestones`, `PATCH /products/:id/milestones/:milestoneId`, `POST /products/:id/milestones/:milestoneId/complete`, `POST /products/:id/milestones/:milestoneId/reopen`, `DELETE /products/:id/milestones/:milestoneId`, `POST /products/:id/milestones/reorder` | read = product viewers; write = `milestone.manage` + product owner or admin; past stages read-only; locked while a gate request is pending |
| Stage gate | `GET /products/:productId/gate` (submission state: next stage, checks, policy, eligible approvers, pending/latest request), `POST /products/:productId/gate` (submit), `POST /products/:productId/gate/decision` (`APPROVED` / `REJECTED` / `PARKED` + optional reason) | view = `gate.view`; submit = `gate.submit` + product owner or admin; decide = `gate.decide`, any evaluator/admin, not the owner or submitter unless self-approval is allowed; readiness re-validated server-side; one pending request per product; decisions are race-safe, append-only, and approval advances exactly one stage |
| Ideas | `GET /ideas` (+status/q/sort/page, returns per-status counts), `PATCH /ideas/:id/status`, `DELETE /ideas/:id`, `POST /ideas/:id/restore` | `idea.view`; approve = `idea.approve`; delete = `idea.delete`; restore = `idea.restore` |
| Dashboard | `GET /dashboard` | any product viewer |
| Notifications | `GET /notifications`, `POST /notifications/read-all`, `POST /notifications/:id/read` | any user (own only) |

**Audit trail (immutable)** records: user created/updated, product created/updated/archived/restored/deleted, team created/updated, idea submitted (incl. anonymous), idea approved, returned to pending, soft-deleted and restored, milestone created/updated/completed/reopened/deleted/reordered, stage-gate submitted (with snapshot metadata and assigned approvers), stage-gate approved/rejected/parked with the decision note. Logins and notification reads are not audited yet.

---

## 5. Data Model (PostgreSQL)

Users (soft-delete, last login), Roles ↔ Permissions, Teams ↔ members (lead flag), Products (stage, health, visibility, archive flag, optional source Idea), Product↔Team assignment, per-team visibility, Milestones (per stage, due date, evidence link), StageHistory, StageTemplates, **StageGateRequest / Approver / Decision**, Ideas (status, evaluator, converted product), Challenges + Submissions, ProductUpdates, ProductFollowers, Notifications, AuditLogs, SystemSettings.

---

## 6. What Is NOT Built Yet — Your "What Can I Add" Map

Schemas are ready for most of these; the endpoints/UI are missing.

### Ideas workflow (highest business value)
- **Convert idea → product** (`Product.ideaId` unique link exists; origin note already renders).
- Assign evaluator to an idea (field exists on the model).
- Evaluator comments / internal notes on ideas.

### Stage gates (the core differentiator)
- **Resume a parked product** (parking is live; there is no resume UI or endpoint yet).
- **Reopen a rejected request** as a new round from the product page (owners can already resubmit a rejected gate).
- Product status filters on the portfolio for parked/rejected products.
- Gate-decision email delivery (in-app notifications are sent).

### Milestones
- Due-date overdue warnings and dashboard surfacing.

### Product engagement
- **Product updates posting UI** (`ProductUpdate` model exists; public timeline already renders them).
- **Follow/unfollow products** (`ProductFollower` model + follower count already display).
- Comments/discussion on product pages.

### Admin governance
- **Audit log viewer** (`AuditService.recent()` exists, `audit.view` permission defined — no controller/UI yet).
- Roles & permissions editor (role-permission join exists; page is a placeholder).
- System settings UI (`SystemSetting` key/value model exists).
- Team create/edit UI (API exists).
- User edit/deactivate UI (API `PATCH` exists).

### Challenges (currently parked)
- Admin CRUD for challenges + submission collection (models + public GET exist; public page was removed by request).

### Analytics
- Real analytics page (placeholder): cycle time per stage, approval turnaround, portfolio health trends, team throughput.

### Notifications
- Richer notification types (gate decisions, mentions, milestone due) and email delivery.

### Public portal polish
- Pagination / load-more on the portfolio explorer.
- Search indexing if the catalog grows (currently client-side filtering of one payload).
- Optional: "My submissions" lookup for idea submitters using the reference code.

---

## 7. Suggested Build Order

1. **Park/resume product flows** (parking and rejection are live; resume and status filters are next).
2. **Convert approved idea → product** (idea review, soft delete and restore are built).
3. **Audit log viewer** (governance requirement; backend mostly done).
4. Product updates + followers (engagement, small effort).
5. Milestone due-date surfacing and notifications.
6. Analytics, roles editor, settings, teams/users editing.
