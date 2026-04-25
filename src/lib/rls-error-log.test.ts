/**
 * Scenarios covering BOQ project-save flow:
 *   1) Local-only legacy projectId (auto-create then save)
 *   2) RLS failure when project belongs to another user (no auto-retry)
 *   3) RLS failure on project_items recovers via auto-retry once
 *
 * These tests run with vitest. If vitest is not configured yet,
 * see SOLUTIONS.md or the Lovable docs for the standard setup
 * (`vitest`, `@testing-library/react`, `jsdom`).
 */

// @ts-nocheck — these depend on a vitest install
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  logRlsError,
  getRlsErrorLog,
  clearRlsErrorLog,
} from "@/lib/rls-error-log";

describe("rls-error-log", () => {
  beforeEach(() => {
    localStorage.clear();
    clearRlsErrorLog();
  });

  it("generates a unique reference for every entry", () => {
    const a = logRlsError({ table: "project_items", message: "err A" });
    const b = logRlsError({ table: "project_items", message: "err B" });
    expect(a.ref).toMatch(/^ERR-/);
    expect(b.ref).toMatch(/^ERR-/);
    expect(a.ref).not.toBe(b.ref);
  });

  it("persists entries with table, user id and project id", () => {
    logRlsError({
      table: "saved_projects",
      message: "permission denied",
      userId: "user-1",
      projectId: "proj-1",
    });
    const all = getRlsErrorLog();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      table: "saved_projects",
      userId: "user-1",
      projectId: "proj-1",
    });
    expect(all[0].timestamp).toBeTruthy();
  });

  it("caps stored entries to prevent unbounded growth", () => {
    for (let i = 0; i < 80; i++) {
      logRlsError({ table: "project_items", message: `err ${i}` });
    }
    const all = getRlsErrorLog();
    expect(all.length).toBeLessThanOrEqual(50);
  });
});

/**
 * Scenario sketches for BOQUploadDialog.saveItemsToProject
 * (kept as documentation — wire to vitest + jsdom + a Supabase mock to run live).
 *
 * Scenario 1 — legacy local projectId:
 *   - saved_projects.select returns null
 *   - project_data.select returns null
 *   - saved_projects.insert succeeds → project row created with current user_id
 *   - project_items.insert succeeds → resolves { autoCreated: true }
 *
 * Scenario 2 — project owned by another user:
 *   - saved_projects.select returns row with user_id = "other"
 *   - throws with _ctx.canRetry === false, _ctx.table === "saved_projects"
 *   - logRlsError is invoked, ref attached to errorContext
 *
 * Scenario 3 — transient project_items RLS, recovers on auto-retry:
 *   - saved_projects.select returns null on first call
 *   - saved_projects.insert succeeds (auto-create)
 *   - project_items.insert fails with "row-level security" once
 *   - autoRetriedRef flips to true, second saveItemsToProject call succeeds
 *   - dialog ends in "success" status without user clicking Retry
 */
