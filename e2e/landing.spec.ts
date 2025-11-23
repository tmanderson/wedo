import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('displays WeDo branding and hero content', async ({ page }) => {
    await page.goto('/');

    // Check branding
    await expect(page.locator('h1')).toContainText('WeDo');

    // Check tagline
    await expect(page.getByText('Collaborative gift registries')).toBeVisible();

    // Check CTA button
    const getStartedButton = page.getByRole('link', { name: 'Get Started' });
    await expect(getStartedButton).toBeVisible();
    await expect(getStartedButton).toHaveAttribute('href', '/auth/signin');
  });

  test('displays feature cards', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Collaborative Lists')).toBeVisible();
    await expect(page.getByText('Privacy Protected')).toBeVisible();
    await expect(page.getByText('Easy Invites')).toBeVisible();
  });

  test('Get Started navigates to sign-in page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Get Started' }).click();

    await expect(page).toHaveURL('/auth/signin');
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });
});
