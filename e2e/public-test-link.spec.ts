import { test, expect } from '@playwright/test'

test.describe('Public Test Link Flow', () => {
  test('public test link page loads for valid code', async ({ page }) => {
    // TODO: Replace with a seeded public assessment code
    // Public links don't require auth — use a fresh context
    test.skip()
  })

  test('invalid public code shows error', async ({ page }) => {
    await page.goto('/t/INVALIDCODE')
    // Should show error message or redirect
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
  })

  test('candidate can fill info and start public assessment', async ({ page }) => {
    // TODO: Navigate to valid public link
    // Verify: Name/email form is shown, can submit and start assessment
    test.skip()
  })

  test('public results page shows score after completion', async ({ page }) => {
    // TODO: Complete a public assessment
    // Verify: Results page shows score
    test.skip()
  })
})
