import { test, expect } from "@playwright/test";

/**
 * E2E: GlobalSearch (Cmd/Ctrl+K command dialog)
 *
 * Verifies the modal opens, accepts a query, and that selecting a
 * result navigates to the expected route.
 */
test.describe("GlobalSearch", () => {
  test("opens via keyboard shortcut and routes to a page result", async ({
    page,
  }) => {
    await page.goto("/");

    // Open the search dialog with Ctrl+K (works for both mac/linux in Playwright).
    await page.keyboard.press("Control+K");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const input = dialog.getByPlaceholder(/search anything|ابحث/i);
    await expect(input).toBeVisible();
    await input.fill("dashboard");

    // Click the first matching result.
    const dashboardItem = dialog.getByText(/^Dashboard$|لوحة التحكم/).first();
    await expect(dashboardItem).toBeVisible();
    await dashboardItem.click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("searches projects keyword and routes to projects list", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Control+K");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder(/search anything|ابحث/i).fill("projects");
    const item = dialog.getByText(/Saved Projects|المشاريع المحفوظة/).first();
    await item.click();

    await expect(page).toHaveURL(/\/projects/);
  });
});
