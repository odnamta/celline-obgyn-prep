import { test, expect } from '@playwright/test'

test.describe('User Profile & Navigation', () => {
  test('profile page loads', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
  })

  test('notifications page loads', async ({ page }) => {
    await page.goto('/notifications')
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
  })

  test('command palette opens with Cmd+K', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Meta+k')
    // Command palette should appear with search input
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('can navigate between main sections', async ({ page }) => {
    // Dashboard → Library → Assessments → back
    await page.goto('/dashboard')
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 })

    await page.goto('/library')
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 })

    await page.goto('/assessments')
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
  })
})
