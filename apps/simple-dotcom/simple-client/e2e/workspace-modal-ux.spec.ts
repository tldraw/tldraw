import { expect, test } from './fixtures/test-fixtures'

test.describe('Workspace Modal UX (BUG-02 Fixes)', () => {
	test('should handle keyboard shortcuts in create workspace modal', async ({
		authenticatedPage,
	}) => {
		const page = authenticatedPage

		// Navigate to dashboard
		await page.goto('/dashboard')
		await page.waitForSelector('[data-testid="create-workspace-button"]')

		// Open modal
		await page.click('[data-testid="create-workspace-button"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]')

		// Test 1: Auto-focus - input should be focused automatically
		const inputElement = page.locator('[data-testid="workspace-name-input"]')
		await expect(inputElement).toBeFocused()

		// Test 2: Escape key closes modal
		await page.keyboard.press('Escape')
		await expect(inputElement).not.toBeVisible()

		// Re-open modal for next tests
		await page.click('[data-testid="create-workspace-button"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]')

		// Test 3: Enter key submits form when valid
		const workspaceName = `Test Workspace ${Date.now()}`
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.keyboard.press('Enter')

		// Modal should close and workspace should appear in list
		await expect(inputElement).not.toBeVisible()
		await expect(page.locator(`text="${workspaceName}"`)).toBeVisible()
	})

	test('should prevent duplicate workspace names', async ({ authenticatedPage }) => {
		const page = authenticatedPage

		// Navigate to dashboard
		await page.goto('/dashboard')
		await page.waitForSelector('[data-testid="create-workspace-button"]')

		// Create first workspace
		const duplicateName = `Duplicate Test ${Date.now()}`
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', duplicateName)
		await page.click('[data-testid="confirm-create-workspace"]')

		// Wait for modal to close and workspace to appear
		await page.waitForSelector(`text="${duplicateName}"`)

		// Try to create another workspace with same name
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', duplicateName)
		await page.click('[data-testid="confirm-create-workspace"]')

		// Should show error message inline
		const errorMessage = page.getByText('A workspace with this name')
		await expect(errorMessage).toBeVisible()
		await expect(errorMessage).toContainText('A workspace with this name already exists')

		// Modal should still be open
		await expect(page.locator('[data-testid="workspace-name-input"]')).toBeVisible()
	})
})
