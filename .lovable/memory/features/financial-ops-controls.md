---
name: Financial & Operational Controls
description: Audit logging, record locking, contract variations, risk scoring/heatmap, procurement workflow, currency normalization
type: feature
---
Tables: `financial_audit_logs`, `record_locks`, `contract_variations`, `currency_rates` + extra columns on `risks` (probability_score, impact_score, last_alerted_at).

Helpers: `public.is_record_locked(type,id)` and `public.enforce_record_lock()` trigger on progress_certificates, contract_payments, procurement_items — UPDATE/DELETE blocked if locked.

Client primitives:
- `src/lib/financial-audit.ts` — `logFinancialAction()` + `fetchAuditTrail()`
- `src/hooks/useRecordLock.ts` — `{ locked, lock(reason), unlock() }`
- `src/lib/currency.ts` + `useCurrency()` — rates cached 5min
- `src/components/audit/LockBadge.tsx`, `AuditTrailDrawer.tsx`

Mounts:
- RiskPage: RiskHeatmap + RiskMatrix + RiskAlertsPanel above RiskManagement (score ≥15 = critical)
- ProcurementPage: ProcurementWorkflow stepper in procurement tab; SupplierComparisonMatrix in compare tab
- ContractsPage: ContractExpiryAlerts in alerts tab (90-day horizon); ContractVariations + ContractLifecycleTimeline imported (per-contract use)
- SubcontractorsPage: new "Profiles" tab with profile/payments/certifications
- LibraryPage: PriceLibraryHistory below LibraryDatabase
- QuotationsPage: SupplierComparisonMatrix in compare tab

Currency rates seeded: USD, EUR, SAR, AED, EGP, GBP, KWD, QAR — admin-only writes.
