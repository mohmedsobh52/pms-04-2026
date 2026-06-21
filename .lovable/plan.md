# Enhance Financial & Operational Modules

Goal: Add enterprise-grade financial and operational controls on top of existing modules without breaking workflows. All work is additive (new components + thin overlays on existing pages) plus one schema migration for audit + record locking + risk scoring + variations.

## 1. Database (single migration)

New tables (all with GRANTs + RLS scoped via `user_owns_project` or `auth.uid()`):

- `financial_audit_logs` — `id, user_id, project_id, entity_type, entity_id, action, before jsonb, after jsonb, created_at`. Indexed on (project_id, created_at).
- `record_locks` — `id, entity_type, entity_id, locked_by, locked_at, reason`. Unique (entity_type, entity_id). Used to lock approved certificates / payments / POs.
- `contract_variations` — `id, contract_id, variation_number, description, amount, status (pending/approved/rejected), approved_by, approved_at, created_at`.
- `risk_scores` — extends existing `risks` via new columns: `probability_score (1-5)`, `impact_score (1-5)`, `risk_score generated as P*I`, `last_alerted_at`. (ALTER existing table, additive only.)
- `currency_rates` — `code, rate_to_usd, updated_at` for normalization.

Helper SQL function `public.is_record_locked(_type text, _id uuid) returns boolean`.

## 2. Cost & Pricing enhancements

- `src/components/cost/CostBreakdownPanel.tsx` — reusable breakdown card (labor / materials / equipment / overhead / profit) reading from existing `item_costs`.
- `src/components/cost/PriceLibraryHistory.tsx` — timeline view of `pricing_history` + `edited_boq_prices`.
- `src/components/cost/SupplierComparisonMatrix.tsx` — matrix view of `price_quotations` across suppliers per item (rebuilds existing `SupplierComparisonTable` as a matrix).
- `src/lib/currency.ts` + `useCurrency()` hook — normalize values to display currency using `currency_rates`.

Mount in: `CostAnalysisPage`, `LibraryPage`, `QuotationsPage` (additive sections).

## 3. Procurement workflow

- `src/components/procurement/ProcurementWorkflow.tsx` — 7-stage stepper (Request → Approval → RFQ → Comparison → PO → Delivery → Invoice → Payment). Reads/writes `procurement_items.status`.
- Action buttons per stage, gated by `Can` (role check) and `is_record_locked`.
- Mount as new tab inside `ProcurementPage`.

## 4. Contracts

- `src/components/contracts/ContractVariations.tsx` — CRUD over new `contract_variations`, totals rollup vs original contract value.
- `src/components/contracts/ContractExpiryAlerts.tsx` — derives alerts from `contracts.end_date` (30/60/90 days), reuses `NotificationsPopover` pattern.
- `src/components/contracts/ContractLifecycleTimeline.tsx` — visual lifecycle (Draft → Active → Variations → Closeout → Warranty) from existing fields.

Mount in `ContractsPage` as new tabs.

## 5. Subcontractors

- `src/components/subcontractors/SubcontractorProfile.tsx` — profile card with rating from `partner_reviews`.
- `src/components/subcontractors/SubcontractorCertifications.tsx` — documents list (reuses `project_attachments` filtered by partner).
- `src/components/subcontractors/SubcontractorPayments.tsx` — payment ledger from `contract_payments` filtered by partner.

Mount in `SubcontractorsPage` and `PartnerDetailsPage`.

## 6. Risk management

- `src/components/risk/RiskScoreEditor.tsx` — P×I sliders → score.
- `src/components/risk/RiskHeatmap.tsx` — 5×5 grid coloring by count.
- `src/components/risk/RiskMatrix.tsx` — scatter of risks on P/I axes.
- `src/components/risk/RiskAlertsPanel.tsx` — list of risks with score ≥ 15.

Mount in `RiskPage` (new tabs).

## 7. Audit + Locking primitives

- `src/lib/financial-audit.ts` — wrapper `logFinancialAction({entity_type, entity_id, action, before, after})` that inserts into `financial_audit_logs`.
- `src/hooks/useRecordLock.ts` — `{ locked, lock(reason), unlock() }`.
- `src/components/audit/LockBadge.tsx` — small badge "Locked – approved" used in tables.
- `src/components/audit/AuditTrailDrawer.tsx` — side drawer listing audit entries for a given entity.

Wire into: progress certificates approval, contract payments approval, PO approval. On approve → log audit + create lock. Edits to locked records are blocked client-side (button disabled) and server-side (RLS-using-trigger via simple BEFORE UPDATE trigger that raises if locked).

## Files

**New (~22):**
- `supabase/migrations/<ts>_financial_ops_enhancements.sql`
- `src/lib/financial-audit.ts`, `src/lib/currency.ts`
- `src/hooks/useRecordLock.ts`, `src/hooks/useCurrency.ts`
- `src/components/audit/{LockBadge,AuditTrailDrawer}.tsx`
- `src/components/cost/{CostBreakdownPanel,PriceLibraryHistory,SupplierComparisonMatrix}.tsx`
- `src/components/procurement/ProcurementWorkflow.tsx`
- `src/components/contracts/{ContractVariations,ContractExpiryAlerts,ContractLifecycleTimeline}.tsx`
- `src/components/subcontractors/{SubcontractorProfile,SubcontractorCertifications,SubcontractorPayments}.tsx`
- `src/components/risk/{RiskScoreEditor,RiskHeatmap,RiskMatrix,RiskAlertsPanel}.tsx`

**Edited (mount only, no logic rewrite):**
- `ProcurementPage.tsx`, `ContractsPage.tsx`, `SubcontractorsPage.tsx`, `RiskPage.tsx`, `CostAnalysisPage.tsx`, `LibraryPage.tsx`, `QuotationsPage.tsx`, `PartnerDetailsPage.tsx`

## Out of scope / risk

- No changes to existing EVM, BOQ, or analysis logic.
- No edge functions added.
- Currency conversion uses cached rates table — no external API call in this pass; user can seed rates manually or via future job.
- Lock trigger affects only the new approval flows; existing rows remain unlocked.

Risk: low — every change is additive. If lock trigger misfires, drop it; UI continues to function.
