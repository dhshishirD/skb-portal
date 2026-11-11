import { test, expect } from '@playwright/test';

test.describe('Authentication & MFA Flows', () => {
  test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2').first()).toContainText(/Sign in/i);
    await expect(page.getByRole('button', { name: /Sign In to Workspace/i })).toBeVisible();
  });

  test('login page does not expose a staff roster or 1-click sign-in', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/instantly access/i)).toHaveCount(0);
    await expect(page.getByText(/@skb\.org\.bd|@gmail\.com/i)).toHaveCount(0);
  });

  test('new staff tab explains invite-only access and has no self-registration form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /New staff\? How to get access/i }).click();
    await expect(page.getByText(/created by invitation only/i)).toBeVisible();
    await expect(page.getByText(/Pending Role Activation/i)).toHaveCount(0);
    await expect(page.getByText(/International Partner Workspace/i)).toHaveCount(0);
  });

  test('navigates to MFA verification screen', async ({ page }) => {
    await page.goto('/mfa');
    await expect(page.locator('h2')).toContainText('MFA Verification Required');
    await expect(page.getByRole('button', { name: /Verify & Continue/i })).toBeVisible();
  });

  test('set-password page requires at least 10 characters', async ({ page }) => {
    await page.goto('/set-password');
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('minLength', '10');
  });

  test('set-password shows server-side errors', async ({ page }) => {
    await page.goto('/set-password?error=Password+must+be+at+least+10+characters.');
    await expect(page.locator('p[role="alert"]')).toContainText('at least 10 characters');
  });

  test('reset-password reports a failure instead of a fake success', async ({ page }) => {
    // E2E runs without a Supabase backend, so the request fails; the page must say so
    // (previously the error redirect was swallowed and "email sent" was shown).
    await page.goto('/reset-password');
    await page.locator('input[name="email"]').fill('nobody@example.org');
    await page.getByRole('button', { name: /Send Reset Link/i }).click();
    await expect(page.locator('p[role="alert"]')).toBeVisible();
    await expect(page.getByText(/reset link is on its way/i)).toHaveCount(0);
  });
});

test.describe('Server-side route protection', () => {
  for (const path of ['/home', '/no-access', '/admin/users', '/dashboard', '/projects', '/projects/11111111-1111-4111-8111-111111111111/overview', '/beneficiaries', '/community', '/donor-dashboard?partner=IHH', '/field-dashboard']) {
    test(`anonymous visit to ${path} redirects to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
    });
  }

  for (const path of ['/api/me', '/api/community/files']) {
    test(`anonymous GET ${path} is rejected`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(401);
    });
  }
});
