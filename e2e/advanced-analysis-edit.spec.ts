import { test, expect } from "@playwright/test";

/**
 * E2E smoke for the Advanced Analysis inline-edit flow.
 *
 * NOTE: requires authenticated session + a project with at least one BOQ
 * item. In CI we expect a seeded test user — when not available, the test
 * is skipped gracefully so it doesn't block the pipeline.
 */
test.describe("Advanced Analysis — inline edit", () => {
  test.skip(
    !process.env.E2E_TEST_USER_EMAIL || !process.env.E2E_TEST_PROJECT_ID,
    "Requires E2E_TEST_USER_EMAIL and E2E_TEST_PROJECT_ID env vars",
  );

  test("Edit button opens inline edit on the same row", async ({ page }) => {
    const projectId = process.env.E2E_TEST_PROJECT_ID!;
    await page.goto(`/projects/${projectId}`);

    // Switch to Advanced Analysis tab
    await page.getByRole("tab", { name: /analysis|تحليل/i }).click();

    // Find a row, open its action menu and click Edit
    const firstRow = page.locator("table tbody tr").first();
    const targetText = await firstRow
      .locator("td")
      .nth(1)
      .innerText();
    await firstRow.getByRole("button", { name: /actions|إجراءات/i }).click();
    await page.getByRole("menuitem", { name: /edit|تعديل/i }).click();

    // The textarea should appear inside the SAME row, prefilled
    const textarea = firstRow.locator("textarea");
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue(new RegExp(targetText.slice(0, 10)));
  });
});
