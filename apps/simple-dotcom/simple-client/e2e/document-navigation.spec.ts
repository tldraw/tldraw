import { expect, test } from './fixtures/test-fixtures'

/**
 * Document Navigation Tests
 *
 * Tests for document navigation flows including:
 * - Opening documents from workspace browser
 * - Browser back button behavior
 * - Recent documents tracking via navigation
 */
test.describe('Document Navigation and Recent Tracking', () => {
	test('should update recent documents order when document is accessed multiple times', async ({
		authenticatedPage,
		testData,
		testUser,
	}) => {
		const page = authenticatedPage

		// Create a workspace with two documents
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `Multi Access Test ${Date.now()}`,
		})

		const doc1Name = `First Doc ${Date.now()}`
		const doc1 = await testData.createDocument({
			workspaceId: workspace.id,
			createdBy: testUser.id,
			name: doc1Name,
		})

		const doc2Name = `Second Doc ${Date.now()}`
		const doc2 = await testData.createDocument({
			workspaceId: workspace.id,
			createdBy: testUser.id,
			name: doc2Name,
		})

		// Navigate to workspace browser
		await page.goto(`/workspace/${workspace.id}`)
		await page.waitForLoadState('networkidle')

		// Open first document
		await page.locator(`[data-testid="document-${doc1.id}"]`).click()
		await page.waitForURL(`**/d/${doc1.id}`)
		await page.waitForLoadState('networkidle')
		await page.goBack()
		await page.waitForURL(`**/workspace/${workspace.id}`)
		await page.waitForLoadState('networkidle')

		// Small delay to ensure timestamps differ
		await page.waitForTimeout(100)

		// Open second document
		await page.locator(`[data-testid="document-${doc2.id}"]`).click()
		await page.waitForURL(`**/d/${doc2.id}`)
		await page.waitForLoadState('networkidle')
		await page.goBack()
		await page.waitForURL(`**/workspace/${workspace.id}`)
		await page.waitForLoadState('networkidle')

		// Navigate to dashboard
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Check recent documents order - doc2 should be first (most recent)
		const recentItems = page.locator('[data-testid^="recent-document-"]')
		await expect(recentItems).toHaveCount(2, { timeout: 10000 })

		const firstRecentItem = recentItems.first()
		await expect(firstRecentItem).toContainText(doc2Name)

		// Small delay to ensure timestamps differ
		await page.waitForTimeout(100)

		// Re-open first document (making it most recent)
		await page.goto(`/workspace/${workspace.id}`)
		await page.waitForLoadState('networkidle')
		await page.locator(`[data-testid="document-${doc1.id}"]`).click()
		await page.waitForURL(`**/d/${doc1.id}`)
		await page.waitForLoadState('networkidle')
		await page.goBack()
		await page.waitForURL(`**/workspace/${workspace.id}`)
		await page.waitForLoadState('networkidle')

		// Go back to dashboard
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Now doc1 should be first (most recent)
		const updatedRecentItems = page.locator('[data-testid^="recent-document-"]')
		const newFirstRecentItem = updatedRecentItems.first()
		await expect(newFirstRecentItem).toContainText(doc1Name, { timeout: 10000 })
	})

	test('should show recent documents from multiple workspaces', async ({
		authenticatedPage,
		testData,
		testUser,
	}) => {
		const page = authenticatedPage

		// Create two workspaces with one document each
		const workspace1 = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `Multi Workspace Test 1 ${Date.now()}`,
		})

		const workspace2 = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `Multi Workspace Test 2 ${Date.now()}`,
		})

		const doc1Name = `Workspace 1 Doc ${Date.now()}`
		const doc1 = await testData.createDocument({
			workspaceId: workspace1.id,
			createdBy: testUser.id,
			name: doc1Name,
		})

		const doc2Name = `Workspace 2 Doc ${Date.now()}`
		const doc2 = await testData.createDocument({
			workspaceId: workspace2.id,
			createdBy: testUser.id,
			name: doc2Name,
		})

		// Access document from workspace 1
		await page.goto(`/d/${doc1.id}`)
		await page.waitForLoadState('networkidle')

		// Small delay to ensure timestamps differ
		await page.waitForTimeout(100)

		// Access document from workspace 2
		await page.goto(`/d/${doc2.id}`)
		await page.waitForLoadState('networkidle')

		// Navigate to dashboard
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Both documents should appear in recent list
		const recentList = page.locator('[data-testid="recent-documents-list"]')
		await expect(recentList).toBeVisible({ timeout: 10000 })

		await expect(recentList).toContainText(doc1Name)
		await expect(recentList).toContainText(doc2Name)

		// Should also show workspace context for each
		await expect(recentList).toContainText('Multi Workspace Test 1')
		await expect(recentList).toContainText('Multi Workspace Test 2')
	})
})
