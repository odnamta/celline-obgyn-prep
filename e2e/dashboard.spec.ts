import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    // Dismiss welcome modal if it appears
    const getStarted = page.getByRole('button', { name: 'Get Started' })
    if (await getStarted.isVisible({ timeout: 3000 }).catch(() => false)) {
      await getStarted.click()
    }
  })

  test('dashboard loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('navigation elements are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible({ timeout: 10000 })
  })

  test('can navigate to /library', async ({ page }) => {
    await page.getByRole('link', { name: 'Library', exact: true }).click()
    await expect(page).toHaveURL(/\/library/)
  })
})
