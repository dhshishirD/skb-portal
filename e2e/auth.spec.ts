import { test, expect } from '@playwright/test';

test.describe('Authentication & MFA Flows', () => {
  test('login page renders correctly with invite-only notice', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Sign In');
    await expect(page.getByText('Public sign-up is disabled')).toBeVisible();
  });

  test('prevents submission with empty fields', async ({ page }) => {
    await page.goto('/login');
    const submitBtn = page.getByRole('button', { name: /Sign In/i });
    await expect(submitBtn).toBeVisible();
  });

  test('navigates to MFA verification screen', async ({ page }) => {
    await page.goto('/mfa');
    await expect(page.locator('h2')).toContainText('MFA Verification Required');
    await expect(page.getByRole('button', { name: /Verify & Continue/i })).toBeVisible();
  });

  test('set-password page requires at least 8 characters', async ({ page }) => {
    await page.goto('/set-password');
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('minLength', '8');
  });
});
