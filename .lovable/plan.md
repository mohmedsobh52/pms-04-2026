
# UI/UX Upgrade Plan (Zero Business Logic Changes)

This is a presentation-layer upgrade on top of the existing **Teal Trust** design system and the new `AppShell` already shipped on 5 key pages. No database changes, no workflow changes, no edge function changes.

---

## 1. Dashboard Redesign (`src/pages/HomePage.tsx` + new components)

Modern SaaS layout inside the existing AppShell:

- **KPI Row** — `DashboardKpiCard` (new): 4 cards — Active Projects, Total Contract Value, Open Procurement, Avg CPI. Reads from existing queries (`saved_projects`, `contracts`, `procurement_items`, `cost_control_baselines`). Compact, sticky on desktop.
- **Module Grid** — `ModuleCardGrid` (new): groups existing routes into 6 cards (Workspace, Pricing & Cost, Procurement, Contracts & Risk, Reports, Admin) — same groupings as the sidebar. Responsive `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`.
- **Recent Activity** — `RecentActivityFeed` (new): last 10 entries from `analysis_audit_logs` + `saved_projects.updated_at`. Read-only.
- **Quick Actions** — `QuickActionsBar` (new): New Project, Import BOQ, Open Cost Control, Generate Report — all link to existing routes.

No new tables, no new RPCs. All data already exists.

## 2. Navigation System (extend existing `AppShell`)

- **Sidebar** — already shipped (`AppSidebar.tsx`); add badge counts (open contracts, pending procurement) read from existing tables.
- **Mobile Drawer** — shadcn `Sheet` triggered from `AppTopbar` when `<md`. Reuses `AppSidebar` content.
- **Global Search** — `CommandPalette` (new, Ctrl+K) using shadcn `Command`. Indexes routes + saved projects (client-side fuzzy). No backend.
- **Notifications Center** — `NotificationsPopover` (new). Reads `evm_alert_settings` + `contract_alert_settings` thresholds vs current values → derives unread count client-side. No new table.
- **User Profile Menu** — `UserMenu` (new) in topbar: email, role badge, theme toggle, sign out.
- **Language Switcher** — already exists in `useLanguage`; surface in `UserMenu` and topbar.

## 3. Forms & Tables Standardization (new shared primitives)

New files under `src/components/ui-ext/`:

- `FormField.tsx` — wraps react-hook-form + zod, label/error/hint, RTL-aware.
- `FormSection.tsx` — titled section with description.
- `DataTable.tsx` — generic table on top of TanStack Table (already installed via shadcn): sticky header, column sort, text filter, pagination, row selection, empty state, responsive horizontal scroll, mobile card fallback.
- `TableToolbar.tsx` — search + filter chips + column visibility.
- `useTableState.ts` — persists sort/filter/page to URL search params.

**Adoption is opt-in** — existing tables continue to work. We migrate 2 reference screens (Projects list, Procurement list) as examples; the rest stay untouched.

## 4. Authentication & RBAC (additive only)

Keep existing Supabase auth. The `user_roles` table + `has_role()` RPC already exist with one role enum value (`admin`). I'll:

- **Extend the enum** via migration: add `pm`, `cost_engineer`, `qs`, `procurement`, `site_engineer`, `subcontractor`, `viewer`. Existing `admin` rows untouched.
- **`useUserRoles` hook** — fetches `user_roles` for current user, caches via react-query.
- **`<RequireRole roles={[...]}>`** component — wraps route elements; redirects to `/` with a toast if user lacks any of the listed roles.
- **`<Can role="...">`** component — conditionally renders UI (e.g. hides "Delete Project" for `viewer`).
- **Role badge** in UserMenu.
- **No route is hard-blocked yet** — `RequireRole` is wired into the router but every existing route stays open by default. We apply roles to admin-only routes (`/admin/*`, edge function settings) and procurement/cost pages as a starting baseline. Easy to tighten later without touching pages.

Permission map (initial, conservative):

| Area | Allowed roles |
|---|---|
| Admin pages | admin |
| Cost Control writes | admin, pm, cost_engineer |
| Procurement writes | admin, pm, procurement |
| Contracts writes | admin, pm, qs |
| All reads | all roles incl. viewer |

## Files

**New**
```
src/components/dashboard/DashboardKpiCard.tsx
src/components/dashboard/ModuleCardGrid.tsx
src/components/dashboard/RecentActivityFeed.tsx
src/components/dashboard/QuickActionsBar.tsx
src/components/layout/CommandPalette.tsx
src/components/layout/NotificationsPopover.tsx
src/components/layout/UserMenu.tsx
src/components/layout/MobileNavDrawer.tsx
src/components/ui-ext/FormField.tsx
src/components/ui-ext/FormSection.tsx
src/components/ui-ext/DataTable.tsx
src/components/ui-ext/TableToolbar.tsx
src/components/ui-ext/useTableState.ts
src/components/auth/RequireRole.tsx
src/components/auth/Can.tsx
src/hooks/useUserRoles.ts
supabase/migrations/<ts>_extend_app_role_enum.sql
```

**Edited (presentation only)**
```
src/pages/HomePage.tsx           — new dashboard layout
src/components/layout/AppTopbar.tsx — search, notifications, user menu, mobile trigger
src/components/layout/AppSidebar.tsx — badge counts
src/App.tsx                      — mount CommandPalette + RequireRole on admin routes
src/pages/SavedProjectsPage.tsx  — adopt DataTable (reference)
src/pages/ProcurementPage.tsx    — adopt DataTable (reference)
```

## Out of scope (explicit)

- No changes to BOQ analysis, EVM math, cost-control formulas, AI prompts, edge functions, RLS policies, RPCs.
- No changes to existing migrations.
- Other pages keep their current layout and tables until separately migrated.

## Risk

- **Low.** All work is additive. The role enum extension is backward-compatible (existing `admin` rows stay valid). `RequireRole` is opt-in per route. Existing pages compile unchanged.
