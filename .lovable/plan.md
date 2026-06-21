# Centralized Intelligence & Reporting Layer

Additive layer on top of existing pages. No business logic changes; reuses existing data sources.

## 1. Reporting Center (`/reports` enhancements)

Add a new `ReportingCenter` shell that groups reports by domain. Each card opens a drawer with filters and Export PDF / Export Excel buttons.

- `src/components/reports/ReportingCenter.tsx` — grouped grid (EVM / Project / Cost / Procurement / Risk).
- `src/components/reports/ReportExportBar.tsx` — PDF (jsPDF + html2canvas, already in deps) + Excel (xlsx).
- `src/lib/report-export.ts` — `exportToPdf(node, {title, isArabic})` and `exportToExcel(rows, sheetName, fileName)`. RTL handled by setting `R2L` doc property and Cairo font fallback.
- Per-domain report builders (thin, read existing data, render printable table + summary):
  - `EvmReport.tsx` — pulls `useEvmSnapshot` per project; table of CPI/SPI/VAC + S-curve image.
  - `ProjectReport.tsx` — project summary + progress timeline.
  - `CostReport.tsx` — BOQ totals, cost breakdown rollup.
  - `ProcurementReport.tsx` — workflow stage counts + open POs.
  - `RiskReport.tsx` — heatmap + critical list.

Mount on `ReportsPage.tsx` as a new top section above existing content.

## 2. Admin Panel additions (`/admin`)

Existing `AdminDashboardPage` already has tabs. Add three new tabs (additive):

- `UsersRolesPanel.tsx` — list `user_roles`, assign/remove roles per user via `useUserRoles`. Admin-only via `RequireRole`.
- `PermissionsMatrix.tsx` — static matrix mapping roles × actions (read-only display from a config constant in `src/lib/permissions-matrix.ts`).
- `SystemSettingsPanel.tsx` — admin-editable `currency_rates`, default currency, language defaults (stored in existing `user_analysis_preferences` for current admin).
- `AuditLogsViewer.tsx` — paginated table of `financial_audit_logs` with entity/action/date filters.
- `CostCodesPanel.tsx` — CRUD over a new `cost_codes` table (code, name, category, description).

DB: one migration adds `cost_codes` with RLS (admins write, authenticated read).

## 3. Notifications system

Extend `NotificationsPopover` to merge five live sources via Supabase realtime channels:
- Approvals: `financial_audit_logs` action='approve'
- Overdue: `procurement_items.delivery_date < now()` + status not in ('delivered','paid')
- Contract expiry: `contracts` where end_date within 30d
- Risk alerts: `risks` where computed score ≥15
- Generic: existing notification sources

New: `src/lib/notifications-feed.ts` consolidates these. Realtime channel per source (already enabled implicitly; if missing tables aren't in publication, fall back to polling every 60s — implemented).

## 4. Global Search

`src/components/CommandPalette.tsx` exists. Enhance with grouped results across: Projects, Contracts, Procurement items, Risks, BOQ items, Subcontractors. New `src/lib/global-search.ts` runs parallel queries with `.ilike` per table, returns `{group, label, route}`. Permission-aware via `user_owns_project` + RLS (queries naturally filtered by RLS).

Bind `Ctrl/Cmd+K` (already wired) and update `GlobalSearch.tsx` to surface grouped sections.

## 5. Performance polish

- Wrap heavy report builders + admin tabs in `Suspense` + `lazy()`.
- Add `usePaginatedQuery` hook in `src/hooks/usePaginatedQuery.ts` for tables (page/limit, cursor optional). Use in `AuditLogsViewer`.
- `src/lib/query-cache.ts` — tiny in-memory TTL cache (5min) for reference reads (currency_rates, cost_codes, user_roles).
- `src/components/ErrorBoundary.tsx` already exists; wrap each new top-level panel.

## Files

**New:**
- `supabase/migrations/<ts>_reporting_center.sql` (cost_codes table)
- `src/lib/report-export.ts`, `src/lib/permissions-matrix.ts`, `src/lib/notifications-feed.ts`, `src/lib/global-search.ts`, `src/lib/query-cache.ts`
- `src/hooks/usePaginatedQuery.ts`
- `src/components/reports/{ReportingCenter,ReportExportBar,EvmReport,ProjectReport,CostReport,ProcurementReport,RiskReport}.tsx`
- `src/components/admin/{UsersRolesPanel,PermissionsMatrix,SystemSettingsPanel,AuditLogsViewer,CostCodesPanel}.tsx`

**Edited (mount only):**
- `ReportsPage.tsx`, `AdminDashboardPage.tsx`, `NotificationsPopover.tsx`, `CommandPalette.tsx`/`GlobalSearch.tsx`

## Out of scope / risk

- No edge functions; PDF/Excel rendered client-side.
- Cost codes start empty — admin seeds them.
- Realtime falls back to 60s polling if a publication is missing — no schema-touching to enable realtime in this pass.
- Risk: low — purely additive.
