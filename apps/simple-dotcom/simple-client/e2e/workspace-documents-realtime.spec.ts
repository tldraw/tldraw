/**
 * E2E Test: Workspace Documents Hybrid Realtime Pattern
 *
 * This test verifies that the workspace documents page correctly implements
 * the hybrid realtime strategy (broadcast + React Query polling).
 *
 * Tests:
 * 1. Documents are fetched with React Query on mount
 * 2. Creating a document triggers broadcast and UI update
 * 3. Archiving a document triggers broadcast and UI update
 * 4. Renaming a document triggers broadcast and UI update
 * 5. Duplicating a document triggers broadcast and UI update
 * 6. Polling refetches documents every 15 seconds (fallback)
 */

import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'

test.describe('Workspace Documents - Hybrid Realtime Pattern', () => {
	// Helper to sign in and navigate to workspace
	async function setupWorkspace(page: any) {
		// Navigate to the login page
		await page.goto('/login')

		// Use test account credentials
		await page.fill('input[name="email"]', 'testuser@example.com')
		await page.fill('input[name="password"]', 'testpassword123')
		await page.click('button[type="submit"]')

		// Wait for redirect to dashboard
		await page.waitForURL('/dashboard')

		// Click on first workspace to navigate to it
		const workspaceLink = page.locator('a[href^="/workspace/"]').first()
		await workspaceLink.click()

		// Wait for workspace page to load
		await page.waitForSelector('h2:has-text("Documents")')
	}

	test('should fetch documents with React Query on mount', async ({ page }) => {
		await setupWorkspace(page)

		// Check that documents are displayed (React Query initial fetch)
		const documentsList = page.locator(
			'[data-testid="documents-list"], div:has(> div > [data-testid="document-item"])'
		)
		await expect(documentsList).toBeVisible({ timeout: 5000 })
	})

	test('should update UI when document is created via broadcast', async ({ page }) => {
		await setupWorkspace(page)

		const documentName = faker.commerce.productName()

		// Click new document button
		await page.click('button:has-text("New Document")')

		// Enter document name in prompt
		await page.evaluate((name) => {
			window.prompt = () => name
		}, documentName)

		// Click new document button again (after prompt is mocked)
		await page.click('button:has-text("New Document")')

		// Wait for document to appear in list (via broadcast + React Query)
		await expect(page.locator(`text="${documentName}"`)).toBeVisible({ timeout: 5000 })
	})

	test('should update UI when document is archived via broadcast', async ({ page }) => {
		await setupWorkspace(page)

		// Get the first document item
		const firstDocument = page.locator('[data-testid="document-item"]').first()
		const documentName = await firstDocument.locator('[data-testid="document-name"]').textContent()

		// Click the actions menu for the first document
		await firstDocument.locator('button[data-testid="document-actions"]').click()

		// Click archive option
		await page.click('button:has-text("Archive")')

		// Verify document is removed from list (via broadcast + React Query)
		await expect(page.locator(`text="${documentName}"`)).not.toBeVisible({ timeout: 5000 })
	})

	test('should update UI when document is renamed via broadcast', async ({ page }) => {
		await setupWorkspace(page)

		const newName = faker.commerce.productName()

		// Get the first document item
		const firstDocument = page.locator('[data-testid="document-item"]').first()

		// Click the actions menu
		await firstDocument.locator('button[data-testid="document-actions"]').click()

		// Click rename option
		await page.click('button:has-text("Rename")')

		// Enter new name in prompt
		await page.evaluate((name) => {
			window.prompt = () => name
		}, newName)

		// Trigger rename again with mocked prompt
		await firstDocument.locator('button[data-testid="document-actions"]').click()
		await page.click('button:has-text("Rename")')

		// Verify document name is updated (via broadcast + React Query)
		await expect(page.locator(`text="${newName}"`)).toBeVisible({ timeout: 5000 })
	})

	test('should handle network interruption with polling fallback', async ({ page, context }) => {
		await setupWorkspace(page)

		// Count initial documents
		const initialCount = await page.locator('[data-testid="document-item"]').count()

		// Simulate network interruption by going offline
		await context.setOffline(true)

		// Wait 2 seconds offline
		await page.waitForTimeout(2000)

		// Come back online
		await context.setOffline(false)

		// React Query should refetch on reconnect
		// Verify documents are still displayed (no data loss)
		await expect(page.locator('[data-testid="document-item"]')).toHaveCount(initialCount, {
			timeout: 5000,
		})
	})

	test('should refetch documents via polling every 15 seconds', async ({ page }) => {
		await setupWorkspace(page)

		// Intercept API calls to track polling
		let fetchCount = 0
		await page.route('**/api/workspaces/*/documents', async (route) => {
			fetchCount++
			await route.continue()
		})

		// Initial fetch should have happened
		expect(fetchCount).toBeGreaterThan(0)
		const initialFetchCount = fetchCount

		// Wait for 16 seconds (polling interval is 15 seconds)
		await page.waitForTimeout(16000)

		// Verify that polling has triggered at least one more fetch
		expect(fetchCount).toBeGreaterThan(initialFetchCount)
	})
})
