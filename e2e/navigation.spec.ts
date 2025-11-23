import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("logo links back to home from sign-in page", async ({ page }) => {
    await page.goto("/auth/signin");

    await page.getByRole("link", { name: "WeDo" }).click();

    await expect(page).toHaveURL("/");
  });

  test("accept-invite page shows error for missing token", async ({ page }) => {
    await page.goto("/accept-invite");

    await expect(page.getByText("No invite token provided")).toBeVisible();
    await expect(page.getByRole("button", { name: "Go Home" })).toBeVisible();
  });

  test("accept-invite Go Home button navigates to landing", async ({
    page,
  }) => {
    await page.goto("/accept-invite");

    await page.getByRole("button", { name: "Go Home" }).click();

    await expect(page).toHaveURL("/");
  });

  test("accept-invite page loads with invalid token", async ({ page }) => {
    await page.goto("/accept-invite?token=invalid-token-123");

    // Should show invite UI - page loads and shows "You're Invited!" heading
    await expect(
      page.getByRole("heading", { name: "You're Invited!" }),
    ).toBeVisible({ timeout: 5000 });
  });
});
