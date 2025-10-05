import { expect, test } from './fixtures/test-fixtures'

/**
 * Dashboard Tests (NAV-02)
 *
 * Tests the global dashboard that displays all accessible workspaces simultaneously
 * with collapsible sections, documents, folders, and recent documents.
 */
test.describe('Global Dashboard', () => {
	test.describe('Dashboard Layout and Structure', () => {
		test('should display all accessible workspaces simultaneously in sidebar', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Navigate to dashboard
			await page.goto('/dashboard')

			// Wait for dashboard to load
			await page.waitForSelector('[data-testid="workspace-list"]')

			// Should have sidebar with workspaces
			const sidebar = page.locator('.w-80.border-r')
			await expect(sidebar).toBeVisible()

			// Should have "Create Workspace" button
			await expect(page.locator('[data-testid="create-workspace-button"]')).toBeVisible()

			// Should have at least the private workspace
			const workspaceList = page.locator('[data-testid="workspace-list"]')
			await expect(workspaceList).toBeVisible()
		})

		test('should load dashboard with all workspaces expanded by default', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a shared workspace with documents
			const workspaceName = `Test Workspace ${Date.now()}`
			await page.goto('/dashboard')

			// Wait for workspace list to be visible first
			await page.waitForSelector('[data-testid="workspace-list"]')

			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)
			await page.click('[data-testid="confirm-create-workspace"]')

			// Wait for workspace to appear in the list
			await page.waitForSelector(`text=${workspaceName}`, { timeout: 5000 })

			// Find the workspace item
			const workspaceItems = page.locator('[data-testid^="workspace-item-"]')
			const workspaceCount = await workspaceItems.count()
			expect(workspaceCount).toBeGreaterThan(0)

			// All workspaces should be expanded by default (showing content)
			for (let i = 0; i < workspaceCount; i++) {
				const workspace = workspaceItems.nth(i)
				const workspaceId = await workspace.getAttribute('data-testid')
				const id = workspaceId?.replace('workspace-item-', '')

				if (id) {
					const contentSection = page.locator(`[data-testid="workspace-content-${id}"]`)
					await expect(contentSection).toBeVisible()
				}
			}
		})
	})

	test.describe('Collapsible Workspace Sections', () => {
		test('should toggle workspace sections open and closed', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace
			const workspaceName = `Collapsible Test ${Date.now()}`
			await page.goto('/dashboard')
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)
			await page.click('[data-testid="confirm-create-workspace"]')

			// Wait for workspace to appear
			await page.waitForTimeout(500)

			// Find the first workspace (the one we just created)
			const firstWorkspace = page.locator('[data-testid^="workspace-item-"]').first()
			const workspaceId = (await firstWorkspace.getAttribute('data-testid'))?.replace(
				'workspace-item-',
				''
			)
			expect(workspaceId).toBeTruthy()

			if (!workspaceId) return

			// Should be expanded by default
			const contentSection = page.locator(`[data-testid="workspace-content-${workspaceId}"]`)
			await expect(contentSection).toBeVisible()

			// Collapse the workspace
			const toggleButton = page.locator(`[data-testid="toggle-workspace-${workspaceId}"]`)
			await toggleButton.click()
			await page.waitForTimeout(200)

			// Content should be hidden
			await expect(contentSection).not.toBeVisible()

			// Expand again
			await toggleButton.click()
			await page.waitForTimeout(200)

			// Content should be visible again
			await expect(contentSection).toBeVisible()
		})
	})

	test.describe('Workspace CRUD from Dashboard', () => {
		test('should create new workspace and see it in dashboard', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage
			const workspaceName = `Dashboard Create Test ${Date.now()}`

			await page.goto('/dashboard')

			// Click create workspace button
			await page.click('[data-testid="create-workspace-button"]')

			// Fill in workspace name
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)

			// Confirm creation
			await page.click('[data-testid="confirm-create-workspace"]')

			// Wait for modal to close
			await page.waitForTimeout(500)

			// Should see the new workspace in the list
			const workspaceList = page.locator('[data-testid="workspace-list"]')
			await expect(workspaceList).toContainText(workspaceName)
		})

		test('should rename workspace from dashboard', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage
			const originalName = `Original ${Date.now()}`
			const newName = `Renamed ${Date.now()}`

			// Create a workspace
			await page.goto('/dashboard')
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', originalName)
			await page.click('[data-testid="confirm-create-workspace"]')
			await page.waitForTimeout(500)

			// Find and rename the workspace
			const firstSharedWorkspace = page
				.locator('[data-testid^="workspace-item-"]')
				.filter({ hasText: originalName })
				.first()
			const workspaceId = (await firstSharedWorkspace.getAttribute('data-testid'))?.replace(
				'workspace-item-',
				''
			)

			if (workspaceId) {
				// Click rename button
				await page.click(`[data-testid="rename-workspace-${workspaceId}"]`)

				// Enter new name
				await page.fill('[data-testid="rename-workspace-input"]', newName)

				// Confirm
				await page.click('[data-testid="confirm-rename-workspace"]')
				await page.waitForTimeout(500)

				// Should see new name
				await expect(page.locator('[data-testid="workspace-list"]')).toContainText(newName)
				await expect(page.locator('[data-testid="workspace-list"]')).not.toContainText(originalName)
			}
		})

		test('should delete workspace from dashboard and it disappears immediately', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage
			const workspaceName = `Delete Test ${Date.now()}`

			// Create a workspace
			await page.goto('/dashboard')
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)
			await page.click('[data-testid="confirm-create-workspace"]')
			await page.waitForTimeout(500)

			// Verify it exists
			await expect(page.locator('[data-testid="workspace-list"]')).toContainText(workspaceName)

			// Find and delete the workspace
			const workspace = page
				.locator('[data-testid^="workspace-item-"]')
				.filter({ hasText: workspaceName })
				.first()
			const workspaceId = (await workspace.getAttribute('data-testid'))?.replace(
				'workspace-item-',
				''
			)

			if (workspaceId) {
				// Click delete button
				await page.click(`[data-testid="delete-workspace-${workspaceId}"]`)

				// Confirm deletion
				await page.click('[data-testid="confirm-delete-workspace"]')
				await page.waitForTimeout(500)

				// Should no longer see the workspace
				await expect(page.locator('[data-testid="workspace-list"]')).not.toContainText(
					workspaceName
				)
			}
		})
	})

	test.describe('Recent Documents Display', () => {
		test('should display recent documents section when documents exist', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			await page.goto('/dashboard')

			// Check for recent documents section
			// Note: This might be empty for new users, which is expected
			const recentSection = page.locator('text=Recent Documents')

			// If no recent documents, should show empty state
			const hasRecentDocs = await recentSection.isVisible()
			if (!hasRecentDocs) {
				await expect(page.locator('text=No recent documents')).toBeVisible()
			}
		})
	})

	test.describe('Dashboard Data Updates', () => {
		test('should reflect workspace removal when user is removed from workspace', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
			page: secondPage,
		}) => {
			const page = authenticatedPage

			// Create a second user
			const secondUserEmail = `dashboard-test-${Date.now()}@example.com`
			const secondUserPassword = 'TestPassword123!'

			// Sign up second user
			await secondPage.goto('/signup')
			await secondPage.fill('[data-testid="name-input"]', 'Second User')
			await secondPage.fill('[data-testid="email-input"]', secondUserEmail)
			await secondPage.fill('[data-testid="password-input"]', secondUserPassword)
			await secondPage.click('[data-testid="signup-button"]')
			await secondPage.waitForURL('**/dashboard**')

			// First user creates a workspace
			const workspaceName = `Shared Test ${Date.now()}`
			await page.goto('/dashboard')
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)
			await page.click('[data-testid="confirm-create-workspace"]')
			await page.waitForTimeout(500)

			// Get workspace ID and add second user via direct database insertion
			// (Since invitation flow is not yet implemented, we add manually)
			const { data: workspaces } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('name', workspaceName)
				.single()

			const { data: secondUserData } = await supabaseAdmin.auth.admin.listUsers()
			const secondUser = secondUserData.users.find((u) => u.email === secondUserEmail)

			if (workspaces && secondUser) {
				// Add second user as member
				await supabaseAdmin.from('workspace_members').insert({
					workspace_id: workspaces.id,
					user_id: secondUser.id,
					role: 'member',
				})

				// Second user should see the workspace
				await secondPage.reload()
				await secondPage.waitForTimeout(500)
				await expect(secondPage.locator('[data-testid="workspace-list"]')).toContainText(
					workspaceName
				)

				// Remove second user from workspace
				await supabaseAdmin
					.from('workspace_members')
					.delete()
					.eq('workspace_id', workspaces.id)
					.eq('user_id', secondUser.id)

				// Reload dashboard
				await secondPage.reload()
				await secondPage.waitForTimeout(500)

				// Workspace should disappear
				await expect(secondPage.locator('[data-testid="workspace-list"]')).not.toContainText(
					workspaceName
				)

				// Cleanup
				await supabaseAdmin.auth.admin.deleteUser(secondUser.id)
			}
		})
	})

	test.describe('Empty States', () => {
		test('should show empty state for new user with only private workspace', async ({
			page,
			supabaseAdmin,
		}) => {
			const email = `empty-dashboard-${Date.now()}@example.com`
			const password = 'TestPassword123!'

			// Sign up new user
			await page.goto('/signup')
			await page.fill('[data-testid="name-input"]', 'New User')
			await page.fill('[data-testid="email-input"]', email)
			await page.fill('[data-testid="password-input"]', password)
			await page.click('[data-testid="signup-button"]')
			await page.waitForURL('**/dashboard**')

			// Should have workspace list visible
			await expect(page.locator('[data-testid="workspace-list"]')).toBeVisible()

			// Should have at least the private workspace
			const workspaceItems = page.locator('[data-testid^="workspace-item-"]')
			const count = await workspaceItems.count()
			expect(count).toBeGreaterThanOrEqual(1)

			// Private workspace should show "No items yet" when expanded
			const privateWorkspace = workspaceItems.filter({ hasText: 'Private' }).first()
			const workspaceId = (await privateWorkspace.getAttribute('data-testid'))?.replace(
				'workspace-item-',
				''
			)

			if (workspaceId) {
				const content = page.locator(`[data-testid="workspace-content-${workspaceId}"]`)
				await expect(content).toContainText('No items yet')
			}

			// Cleanup
			const { data } = await supabaseAdmin.auth.admin.listUsers()
			const user = data.users.find((u) => u.email === email)
			if (user) {
				await supabaseAdmin.auth.admin.deleteUser(user.id)
			}
		})
	})
})
