// @ts-nocheck — depends on vitest install
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => ({ insert: async () => ({ error: null }) }),
  },
}));

import { logAudit, getAuditLog, clearAuditLog } from "@/lib/audit-log";

describe("audit-log", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuditLog();
  });

  it("writes a success entry with a unique ref", () => {
    const a = logAudit({
      userId: "u1",
      projectId: "p1",
      itemNumber: "1.1",
      action: "inline_edit",
      status: "success",
      attempts: 1,
      changedFields: { description: "X" },
    });
    expect(a.ref).toMatch(/^AUD-/);
    const all = getAuditLog();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("success");
    expect(all[0].itemNumber).toBe("1.1");
  });

  it("writes a failure entry with error code/message", () => {
    const a = logAudit({
      userId: "u1",
      projectId: "p1",
      itemNumber: "2.3",
      action: "inline_edit",
      status: "failure",
      attempts: 3,
      errorCode: "42501",
      errorMessage: "row-level security",
    });
    expect(a.status).toBe("failure");
    const all = getAuditLog();
    expect(all[0].errorCode).toBe("42501");
    expect(all[0].attempts).toBe(3);
  });

  it("caps the local log to prevent unbounded growth", () => {
    for (let i = 0; i < 250; i++) {
      logAudit({
        action: "inline_edit",
        status: "success",
        attempts: 1,
        itemNumber: `i-${i}`,
      });
    }
    expect(getAuditLog().length).toBeLessThanOrEqual(200);
  });

  it("each ref is unique across rapid logs", () => {
    const refs = new Set<string>();
    for (let i = 0; i < 50; i++) {
      refs.add(
        logAudit({ action: "inline_edit", status: "success", attempts: 1 }).ref,
      );
    }
    expect(refs.size).toBe(50);
  });
});
