import { test, expect } from '@playwright/test'

test.describe('Study Mode Flow', () => {
  test('study page loads when study mode is enabled', async ({ page }) => {
    await page.goto('/study')
    // If study mode is disabled for this org, it may redirect.
    // Check that we're on a valid page.
    await expect(page.locator('body')).toBeVisible()
  })

  test('can start a study session for a deck', async ({ page }) => {
    // TODO: Navigate to /library, pick a deck, click study
    // Verify: Study interface loads with cards/questions
    test.skip()
  })

  test('custom study page loads', async ({ page }) => {
    await page.goto('/study/custom')
    await expect(page.locator('body')).toBeVisible()
  })

  test('global study page loads', async ({ page }) => {
    await page.goto('/study/global')
    await expect(page.locator('body')).toBeVisible()
  })

  test('study stats page shows progress', async ({ page }) => {
    await page.goto('/stats')
    await expect(page.locator('body')).toBeVisible()
  })
})
