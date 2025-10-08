import { expect, test } from './fixtures/test-fixtures'

/**
 * Workspace Browser Navigation Tests (NAV-03)
 *
 * Tests for the enhanced workspace browser with:
 * - Hierarchical folder tree navigation
 * - Document filtering by folder
 * - Breadcrumb navigation
 * - Archive link in sidebar
 * - Folder creation and management
 */
test.describe('Workspace Browser Navigation', () => {
	test.describe('Folder Tree Navigation', () => {
		test('should display folder tree in sidebar', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace
			const workspaceName = `Test Workspace ${Date.now()}`
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)
			await page.click('[data-testid="confirm-create-workspace"]')
			await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

			// Get workspace ID from URL or card
			const workspaceCard = page.locator('[data-testid^="workspace-card-"]').first()
			await workspaceCard.click()
			await page.waitForURL('**/workspace/**')

			// Verify folder tree section is visible
			await expect(page.locator('h2:has-text("Folders")')).toBeVisible()

			// Verify "All Documents" button is visible
			await expect(page.locator('[data-testid="root-folder-button"]')).toBeVisible()

			// Cleanup
			const workspaceId = page.url().split('/workspace/')[1]
			await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
		})

		test('should allow creating folders from sidebar', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace
			const workspaceName = `Test Workspace ${Date.now()}`
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)
			await page.click('[data-testid="confirm-create-workspace"]')
			await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

			// Navigate to workspace
			const workspaceCard = page.locator('[data-testid^="workspace-card-"]').first()
			await workspaceCard.click()
			await page.waitForURL('**/workspace/**')

			// Click create folder button
			await page.click('[data-testid="create-folder-button"]')

			// Fill folder name
			const folderName = `Test Folder ${Date.now()}`
			await page.fill('[data-testid="folder-name-input"]', folderName)
			await page.click('[data-testid="confirm-create-folder"]')

			// Wait for modal to close
			await page.waitForSelector('[data-testid="folder-name-input"]', { state: 'hidden' })

			// Verify folder appears in sidebar
			await expect(page.locator(`text=${folderName}`)).toBeVisible()

			// Cleanup
			const workspaceId = page.url().split('/workspace/')[1]
			await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
		})

		test('should select folder and filter documents', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace
			const workspaceName = `Test Workspace ${Date.now()}`
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)
			await page.click('[data-testid="confirm-create-workspace"]')
			await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

			// Navigate to workspace
			const workspaceCard = page.locator('[data-testid^="workspace-card-"]').first()
			await workspaceCard.click()
			await page.waitForURL('**/workspace/**')
			const workspaceId = page.url().split('/workspace/')[1]

			// Create a folder
			await page.click('[data-testid="create-folder-button"]')
			const folderName = `Test Folder ${Date.now()}`
			await page.fill('[data-testid="folder-name-input"]', folderName)
			await page.click('[data-testid="confirm-create-folder"]')
			await page.waitForSelector('[data-testid="folder-name-input"]', { state: 'hidden' })

			// Create a document at root level
			await page.click('[data-testid="create-document-button"]')
			const rootDocName = `Root Doc ${Date.now()}`
			await page.fill('[data-testid="document-name-input"]', rootDocName)
			await page.click('[data-testid="confirm-create-document"]')
			await page.waitForURL('**/d/**')
			await page.goto(`/workspace/${workspaceId}`)

			// Click on the folder to select it
			await page.locator(`text=${folderName}`).first().click()

			// Verify breadcrumbs show the folder
			const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]')
			await expect(breadcrumbNav.locator(`text=${folderName}`)).toBeVisible()

			// Root document should not be visible when folder is selected
			const documentList = page.locator('[data-testid="document-list"]')
			if (await documentList.isVisible()) {
				await expect(page.locator(`text=${rootDocName}`)).not.toBeVisible()
			}

			// Click "All Documents" button to return to root
			await page.click('[data-testid="root-folder-button"]')

			// Root document should now be visible
			await expect(page.locator(`text=${rootDocName}`)).toBeVisible()

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
		})
	})

	test.describe('Breadcrumb Navigation', () => {
		test('should display breadcrumbs for folder navigation', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace
			const workspaceName = `Test Workspace ${Date.now()}`
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)
			await page.click('[data-testid="confirm-create-workspace"]')
			await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

			// Navigate to workspace
			const workspaceCard = page.locator('[data-testid^="workspace-card-"]').first()
			await workspaceCard.click()
			await page.waitForURL('**/workspace/**')
			const workspaceId = page.url().split('/workspace/')[1]

			// Create a folder
			await page.click('[data-testid="create-folder-button"]')
			const folderName = `Test Folder ${Date.now()}`
			await page.fill('[data-testid="folder-name-input"]', folderName)
			await page.click('[data-testid="confirm-create-folder"]')
			await page.waitForSelector('[data-testid="folder-name-input"]', { state: 'hidden' })

			// Click on the folder
			await page.locator(`text=${folderName}`).click()

			// Verify breadcrumbs show workspace name and folder name
			const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]')
			await expect(breadcrumbNav).toBeVisible()
			await expect(breadcrumbNav.locator(`text=${workspaceName}`)).toBeVisible()
			await expect(breadcrumbNav.locator(`text=${folderName}`)).toBeVisible()

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
		})
	})

	test.describe('Archive Link', () => {
		test('should display archive link in sidebar', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace
			const workspaceName = `Test Workspace ${Date.now()}`
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)
			await page.click('[data-testid="confirm-create-workspace"]')
			await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

			// Navigate to workspace
			const workspaceCard = page.locator('[data-testid^="workspace-card-"]').first()
			await workspaceCard.click()
			await page.waitForURL('**/workspace/**')
			const workspaceId = page.url().split('/workspace/')[1]

			// Verify archive link is visible in sidebar
			const archiveLink = page.locator('[data-testid="archive-link"]')
			await expect(archiveLink).toBeVisible()

			// Click archive link
			await archiveLink.click()

			// Verify navigation to archive page
			await page.waitForURL(`**/workspace/${workspaceId}/archive`)
			expect(page.url()).toContain('/archive')

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
		})
	})

	test.describe('Document Creation in Folders', () => {
		test('should create document in selected folder', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace
			const workspaceName = `Test Workspace ${Date.now()}`
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)
			await page.click('[data-testid="confirm-create-workspace"]')
			await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

			// Navigate to workspace
			const workspaceCard = page.locator('[data-testid^="workspace-card-"]').first()
			await workspaceCard.click()
			await page.waitForURL('**/workspace/**')
			const workspaceId = page.url().split('/workspace/')[1]

			// Create a folder
			await page.click('[data-testid="create-folder-button"]')
			const folderName = `Test Folder ${Date.now()}`
			await page.fill('[data-testid="folder-name-input"]', folderName)
			await page.click('[data-testid="confirm-create-folder"]')
			await page.waitForSelector('[data-testid="folder-name-input"]', { state: 'hidden' })

			// Select the folder
			await page.locator(`text=${folderName}`).click()

			// Create a document in the folder
			await page.click('[data-testid="create-document-button"]')
			const docName = `Folder Doc ${Date.now()}`
			await page.fill('[data-testid="document-name-input"]', docName)
			await page.click('[data-testid="confirm-create-document"]')

			// Wait for document page to load
			await page.waitForURL('**/d/**')

			// Navigate back to workspace
			await page.goto(`/workspace/${workspaceId}`)

			// Select the folder again
			await page.locator(`text=${folderName}`).click()

			// Document should be visible in the folder
			await expect(page.locator(`text=${docName}`)).toBeVisible()

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
		})
	})

	test.describe('Responsive Layout', () => {
		test('should display two-pane layout on desktop', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace
			const workspaceName = `Test Workspace ${Date.now()}`
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)
			await page.click('[data-testid="confirm-create-workspace"]')
			await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

			// Navigate to workspace
			const workspaceCard = page.locator('[data-testid^="workspace-card-"]').first()
			await workspaceCard.click()
			await page.waitForURL('**/workspace/**')
			const workspaceId = page.url().split('/workspace/')[1]

			// Verify sidebar is visible
			const sidebar = page.locator('aside')
			await expect(sidebar).toBeVisible()

			// Verify main content area is visible
			const mainContent = page.locator('main')
			await expect(mainContent).toBeVisible()

			// Verify both are displayed in a flex layout
			const container = page.locator('div.flex.flex-1.overflow-hidden')
			await expect(container).toBeVisible()

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
		})
	})
})
