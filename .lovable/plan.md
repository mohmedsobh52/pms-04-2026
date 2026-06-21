
# Core Execution Modules — Upgrade Plan

The codebase already has substantial business logic for all four modules. This plan adds the missing UX layers and new connective tissue **on top** of existing data — no business-logic rewrites, no schema changes.

Real-data sources used (no mocks):
- Projects → `saved_projects`, `project_data`, `project_items`, `analysis_audit_logs`
- BOQ → `project_items`, `item_costs`, `boq_templates`, `edited_boq_prices`
- EVM → `cost_control_baselines`, `cost_control_overrides`, `progress_certificates`, `progress_certificate_items`, `project_progress_history`
- Execution Plan → `project_items` (with `start_date`/`end_date`/`progress` already present), `project_progress_history`

---

## 1. Projects — Workspace polish

**File: `src/pages/ProjectDetailsPage.tsx` (already 2014 LOC)** — keep all tabs and logic. Add a slim **Project KPI strip** at the top of the page that derives from existing queries:

- **CPI** = EV / AC  (from `cost_control_baselines` + latest `progress_certificates`)
- **SPI** = EV / PV
- **Cost Variance** = EV − AC
- **Progress %** = weighted completion across `project_items.progress`

New components:
- `src/components/project-details/ProjectKpiStrip.tsx` — 4 cards, color-coded thresholds (>1 green, 0.9–1 amber, <0.9 red). Click → opens existing Cost Control page filtered to this project.
- `src/components/project-details/ProjectActivityFeed.tsx` — reads `analysis_audit_logs` for the project + recent `project_progress_history` and `progress_certificates` events. Added as a new "Activity" tab.

**Projects list (`src/pages/SavedProjectsPage.tsx`)** — add view switcher (Grid / Table) and filter chips (status, currency, last-updated range). Uses the existing `DataTable` primitive for the Table view. No data changes.

## 2. BOQ System

`project_items` already supports hierarchy through `item_number` (e.g. `1.2.3`) and explicit `parent_id` exists via `wbs_data`. New components:

- `src/components/boq/BoqTreeView.tsx` — collapsible tree built from `item_number` segments. Sums quantity × unit_price up the hierarchy. Row click reveals `item_costs` breakdown (already in DB).
- `src/components/boq/BoqVersionPanel.tsx` — lists snapshots from existing `cost_control_baselines` (each baseline is effectively a BOQ snapshot) + recent edits from `edited_boq_prices`. Diff view reuses `BOQVersionComparison.tsx`.
- `src/components/boq/BoqImportExportBar.tsx` — wraps existing import flow (`BOQUploadDialog`) and adds an XLSX export of the current BOQ with `item_number`, `description`, `unit`, `quantity`, `unit_price`, `total_price`, computed unit cost from `item_costs`.

Mounted inside the existing `ProjectBOQTab.tsx` — no new page.

## 3. EVM System

The standalone EVM page (`CostControlEvmStandalone.jsx`, 5676 LOC) already computes PV/EV/AC/CPI/SPI/EAC. We add **embedded EVM widgets** for the project workspace so users don't have to leave the project context:

- `src/components/evm/EvmSummaryCard.tsx` — compact PV/EV/AC + CPI/SPI/EAC numbers for a single project, derived from the same selectors the standalone page uses (extracted into a shared hook `useEvmSnapshot(projectId)`).
- `src/components/evm/EvmTrendMiniChart.tsx` — CPI/SPI sparkline from `cost_control_baselines` history (Recharts).
- `src/components/evm/EvmSCurve.tsx` — PV vs EV vs AC cumulative curve over time. Data: `project_progress_history` for actual, baseline schedule from `cost_control_baselines.baseline_schedule`.
- `src/components/evm/EvmVarianceTable.tsx` — per-WBS variance breakdown (CV, SV, VAC) computed from `project_items` + `item_costs`.

Shared hook: `src/hooks/useEvmSnapshot.ts` — pure read, returns `{ pv, ev, ac, cpi, spi, eac, vac, bac, percentComplete, series }`. Same formulas already in CostControlReportPage; centralized so widgets and the standalone page can both call it.

Mounted in `ProjectOverviewTab.tsx` (new EVM section) and reused by the new ProjectKpiStrip.

## 4. Execution Plan

`project_items` already has `start_date`, `end_date`, `progress`, `predecessors` (in `wbs_data` JSON). We add a read-mostly execution view:

- `src/components/execution/ExecutionTaskList.tsx` — flat task list with progress bars, status badges (Not started / In progress / Delayed / Completed), filter + sort.
- `src/components/execution/ExecutionTimeline.tsx` — simple horizontal Gantt rendered with divs (no library). Shows planned bar + actual progress overlay. Click row → highlights dependencies if `predecessors` present.
- `src/components/execution/DelayBadge.tsx` — computes delay as `today - end_date` when `progress < 100`. Surfaced in both list and timeline.

Mounted as a new "Execution" tab inside `ProjectDetailsPage`. No edits to existing P6/scheduling logic.

---

## Files

**New**
```
src/hooks/useEvmSnapshot.ts
src/components/project-details/ProjectKpiStrip.tsx
src/components/project-details/ProjectActivityFeed.tsx
src/components/boq/BoqTreeView.tsx
src/components/boq/BoqVersionPanel.tsx
src/components/boq/BoqImportExportBar.tsx
src/components/evm/EvmSummaryCard.tsx
src/components/evm/EvmTrendMiniChart.tsx
src/components/evm/EvmSCurve.tsx
src/components/evm/EvmVarianceTable.tsx
src/components/execution/ExecutionTaskList.tsx
src/components/execution/ExecutionTimeline.tsx
src/components/execution/DelayBadge.tsx
```

**Edited (mount only, no logic changes)**
```
src/pages/ProjectDetailsPage.tsx       — add KPI strip, Activity tab, Execution tab
src/components/project-details/ProjectOverviewTab.tsx — embed EVM summary + S-curve
src/components/project-details/ProjectBOQTab.tsx      — mount tree view + version panel + export bar
src/pages/SavedProjectsPage.tsx        — Grid/Table view switcher + filter chips
```

## Out of scope (explicit, per RULES)

- No mock data anywhere. If a metric has no source, the card shows "—" with a tooltip rather than a fake number.
- No changes to `CostControlEvmStandalone.jsx`, `CostControlReportPage.tsx`, edge functions, RLS, RPCs, or migrations.
- No new tables. All four modules read from existing schema.

## Risk

- **Low.** All work is additive. The shared `useEvmSnapshot` hook duplicates existing formulas; if its math drifts from the standalone page we surface "—" instead of incorrect values.
