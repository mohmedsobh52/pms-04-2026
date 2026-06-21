# Enterprise Upgrade — Phased Plan

## Current state (already shipped)

Most of the "foundation" items from your spec are already in this codebase:

- ✅ **AppShell** (sidebar + topbar + breadcrumbs) — `src/components/layout/AppShell.tsx`
- ✅ **Teal design system** + Tajawal/Cairo, RTL/LTR — global tokens in `index.css`
- ✅ **RBAC** — `user_roles` table, `has_role()` SECURITY DEFINER, `RequireRole`, `Can` (just hardened: removed `ADMIN_EMAILS` allowlists, revoked `is_record_locked` from anon)
- ✅ **Financial audit + record locks** — `financial_audit_logs`, `record_locks`, `enforce_record_lock` trigger, `useRecordLock` hook
- ✅ **Notifications popover** with realtime sources, **Global command palette** with cross-module search
- ✅ **Reporting Center** with PDF/Excel export (AR/EN), **Admin Panel** (users/roles, permissions matrix, settings, cost codes, audit logs)
- ✅ **EVM**, **BOQ**, **Procurement workflow stepper**, **Contracts/Variations**, **Risk heatmap+matrix**, **Subcontractors**

## What's genuinely missing → phased delivery

Each phase = one shippable, verifiable slice. Pick one and I'll implement it end-to-end.

---

### Phase A — Workflow Engine (highest leverage)
**New tables:** `workflow_definitions`, `workflow_steps`, `workflow_instances`, `workflow_approvals` (RLS scoped to project owner + assigned approvers).
**Backend:** Postgres functions `start_workflow(entity_type, entity_id, definition_id)`, `approve_step()`, `reject_step()`, SLA timer via `expires_at` + scheduled function.
**Frontend:** `WorkflowStepper` component, `ApprovalPanel`, `WorkflowDefinitionEditor` (admin), mount on procurement/contracts/certificates.
**Wires into:** existing financial-audit logging for every approve/reject.

---

### Phase B — Document Management System
**New tables:** `documents`, `document_versions`, `document_tags`, `document_permissions`. Reuses existing `project-files` storage bucket; adds `expires_at` for contracts/certs.
**Backend:** Trigger that pushes expiry → `record_locks`-style alerts table consumed by NotificationsPopover.
**Frontend:** `DocumentExplorer` (folder tree), `VersionedFileUploader`, `DocumentTagPicker`, expiry badges, search over `documents.tsvector`.

---

### Phase C — Standardized DataTable + Forms
**New:** `src/components/data-table/DataTable.tsx` — TanStack Table v8 with column visibility, sorting, server pagination, virtualization (`@tanstack/react-virtual`), bulk actions, sticky header, mobile card fallback, Excel/PDF export hooks.
**New:** `src/components/forms/EnterpriseForm.tsx` wrapper — react-hook-form + zod, autosave drafts to localStorage, `beforeunload` warning, field-level `<Can permission="...">` gating, conditional fields via `watch()`.
**Migration:** Refactor 3 highest-traffic tables (BOQ items, audit logs, procurement) onto it; rest follow incrementally.

---

### Phase D — Field Mobile Mode
**New route:** `/field` — separate minimal shell, large tap targets.
**Features:** Daily progress entry, photo upload with GPS EXIF capture, voice-to-text via `webkitSpeechRecognition`.
**Offline:** IndexedDB queue (`idb-keyval`), background sync on `online` event. PWA manifest only — no service-worker offline cache to keep Lovable preview clean.

---

### Phase E — Real-time Notification Engine v2
**New tables:** `notifications` (per-user inbox), `notification_preferences`.
**Backend:** Triggers on `procurement_items`, `contracts`, `risks`, `progress_certificates` → insert into `notifications`. Realtime publication.
**Frontend:** Notification center page `/notifications`, dedup by `(user_id, entity_type, entity_id, event)`, preferences UI per type.

---

### Phase F — Security & Performance final pass
- Migrate remaining 13 advisory linter warnings (search_path on every SECURITY DEFINER fn)
- Virtualize BOQ items table (currently renders 1000+ rows)
- Add `React.lazy` to remaining 12 non-lazy routes
- Centralize API layer in `src/lib/api/*` with React Query factory
- Add `ErrorBoundary` per route group

---

## How we work through this

1. You pick a phase letter.
2. I implement it fully in one go (migrations + components + wiring + verification).
3. You test in preview.
4. Move to next phase.

## Out of scope (explicitly)

- Full OCR pipeline (would need an edge function + Tesseract; can add as Phase B.1 if you confirm)
- Native mobile via Capacitor (separate path; PWA-only for now)
- SAML/SSO (Supabase supports it but needs your IdP config)

---

**Which phase first?** My recommendation: **Phase C (DataTable + Forms)** — every other phase benefits from it, and it has the highest visible impact with lowest schema risk.
