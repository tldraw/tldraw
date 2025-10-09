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
	test('should track document as recent when opened from workspace browser and user navigates back', async ({
		authenticatedPage,
		testData,
		testUser,
	}) => {
		const page = authenticatedPage

		// Create a workspace with a document
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `Nav Test Workspace ${Date.now()}`,
		})

		const docName = `Test Document ${Date.now()}`
		const document = await testData.createDocument({
			workspaceId: workspace.id,
			createdBy: testUser.id,
			name: docName,
		})

		// Start at the workspace browser
		await page.goto(`/workspace/${workspace.id}`)
		await page.waitForLoadState('networkidle')

		// Verify the document is visible in the workspace browser
		const documentLink = page.locator(`[data-testid="document-${document.id}"]`)
		await expect(documentLink).toBeVisible()

		// Click the document to open it
		await documentLink.click()

		// Wait for navigation to the document page
		await page.waitForURL(`**/d/${document.id}`)
		await page.waitForLoadState('networkidle')

		// Use browser back button to return to workspace
		await page.goBack()
		await page.waitForURL(`**/workspace/${workspace.id}`)
		await page.waitForLoadState('networkidle')

		// Navigate to dashboard
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Document should now appear in recent documents list
		const recentList = page.locator('[data-testid="recent-documents-list"]')
		await expect(recentList).toBeVisible({ timeout: 10000 })

		// The specific document should be in the recent list
		const recentItem = page.locator(`[data-testid="recent-document-${document.id}"]`)
		await expect(recentItem).toBeVisible({ timeout: 10000 })
		await expect(recentItem).toContainText(docName)
	})

	test('should track document as recent when opened from dashboard sidebar', async ({
		authenticatedPage,
		testData,
		testUser,
	}) => {
		const page = authenticatedPage

		// Create a workspace with a document
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `Dashboard Nav Test ${Date.now()}`,
		})

		const docName = `Dashboard Doc ${Date.now()}`
		const document = await testData.createDocument({
			workspaceId: workspace.id,
			createdBy: testUser.id,
			name: docName,
		})

		// Start at dashboard
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Find the document in the dashboard sidebar
		const documentLink = page.locator(`[data-testid="document-${document.id}"]`)
		await expect(documentLink).toBeVisible()

		// Click the document to open it
		await documentLink.click()

		// Wait for navigation to the document page
		await page.waitForURL(`**/d/${document.id}`)
		await page.waitForLoadState('networkidle')

		// Use browser back button to return to dashboard
		await page.goBack()
		await page.waitForURL('**/dashboard')
		await page.waitForLoadState('networkidle')

		// Wait a bit for React Query to refetch recent documents
		await page.waitForTimeout(1000)

		// Document should appear in recent documents list
		const recentList = page.locator('[data-testid="recent-documents-list"]')
		await expect(recentList).toBeVisible({ timeout: 10000 })

		// The specific document should be in the recent list
		const recentItem = page.locator(`[data-testid="recent-document-${document.id}"]`)
		await expect(recentItem).toBeVisible({ timeout: 10000 })
		await expect(recentItem).toContainText(docName)
	})

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

	test('should track recent document when navigating directly via URL', async ({
		authenticatedPage,
		testData,
		testUser,
	}) => {
		const page = authenticatedPage

		// Create a workspace with a document
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `Direct URL Test ${Date.now()}`,
		})

		const docName = `Direct Access Doc ${Date.now()}`
		const document = await testData.createDocument({
			workspaceId: workspace.id,
			createdBy: testUser.id,
			name: docName,
		})

		// Navigate directly to the document via URL
		await page.goto(`/d/${document.id}`)
		await page.waitForLoadState('networkidle')

		// Navigate to dashboard
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Document should appear in recent documents list
		const recentList = page.locator('[data-testid="recent-documents-list"]')
		await expect(recentList).toBeVisible({ timeout: 10000 })

		// The specific document should be in the recent list
		const recentItem = page.locator(`[data-testid="recent-document-${document.id}"]`)
		await expect(recentItem).toBeVisible({ timeout: 10000 })
		await expect(recentItem).toContainText(docName)
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
