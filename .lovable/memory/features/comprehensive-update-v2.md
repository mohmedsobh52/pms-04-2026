---
name: Comprehensive Update v2
description: Cross-module additions — Certificates S-Curve & Compare, Contract financial bar, Supplier Comparison, Bulk AI Pricing
type: feature
---
# Comprehensive Update (June 2026)

## Certificates
- `src/components/certificates/SCurveChart.tsx` — Recharts S-Curve of cumulative work done. Renders in `/progress-certificates`.
- `src/pages/CertificatesComparePage.tsx` (route `/progress-certificates/compare`) — pick up to 4 certificates and compare side-by-side.

## Contracts
- `src/lib/contract-alerts.ts` — `computeContractExpiryAlert(endDate)` (30/60/90/expired levels) + `computeContractFinancials(contractValue, certificates)`.
- `src/components/contracts/ContractFinancialBar.tsx` — bar showing spent vs contract value, colored by severity, with over-budget badge. Consumes `progress_certificates.contract_id`.

## Procurement
- `src/components/procurement/SupplierComparisonTable.tsx` — search analyzed quotations for an item description, ranks by price with +Δ% deltas. Calls edge function `recommend-supplier` for AI verdict.
- New Procurement tab `compare` integrates the table.

## Pricing
- `src/components/pricing/BulkAIPriceButton.tsx` — bulk-priced unpriced BOQ items via existing `ai-price-from-history` edge function with confidence-based pre-selection (≥60%). Wired into `BOQItemsPage`.

## Edge Functions
- `supabase/functions/recommend-supplier/index.ts` — Lovable AI (google/gemini-2.5-flash); compares supplier offers and returns a textual recommendation. No DB access.
