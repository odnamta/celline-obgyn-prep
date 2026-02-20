import { test, expect } from '@playwright/test'

test.describe('Decks / Library', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss welcome modal if present (it redirects, so go to dashboard first)
    await page.goto('/dashboard')
    const getStarted = page.getByRole('button', { name: 'Get Started' })
    if (await getStarted.isVisible({ timeout: 3000 }).catch(() => false)) {
      await getStarted.click()
      await page.waitForURL(/\/(dashboard|orgs)/, { timeout: 10000 })
    }
    // Now navigate to library
    await page.goto('/library')
  })

  test('library page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/library/)
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()
  })

  test('can navigate to My Library', async ({ page }) => {
    await expect(page).toHaveURL(/\/library/)
    await page.getByRole('link', { name: 'My Library' }).first().click()
    await expect(page).toHaveURL(/\/library\/my/, { timeout: 10000 })
  })
})
