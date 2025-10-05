import { cleanupUserData } from './fixtures/cleanup-helpers'
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
			testData,
			testUser,
		}) => {
			await testData.createWorkspace({
				ownerId: testUser.id,
				name: `Seeded Workspace ${Date.now()}`,
			})
			const page = authenticatedPage

			await page.goto('/dashboard')

			await expect(page.locator('[data-testid="workspace-list"]')).toBeVisible()
			await expect(page.locator('.w-80.border-r')).toBeVisible()
			await expect(page.locator('[data-testid="create-workspace-button"]')).toBeVisible()
		})

		test('should load dashboard with all workspaces expanded by default', async ({
			authenticatedPage,
			testData,
			testUser,
		}) => {
			const sharedWorkspace = await testData.createWorkspace({
				ownerId: testUser.id,
				name: `Seeded Shared ${Date.now()}`,
			})
			await testData.createDocument({
				workspaceId: sharedWorkspace.id,
				createdBy: testUser.id,
				name: `Seeded Doc ${Date.now()}`,
			})

			const page = authenticatedPage
			await page.goto('/dashboard')

			const workspaceItems = page.locator('[data-testid^="workspace-item-"]')
			await expect(workspaceItems.first()).toBeVisible()

			const seededWorkspace = page.locator(`[data-testid="workspace-item-${sharedWorkspace.id}"]`)
			await expect(seededWorkspace).toBeVisible()
			await expect(
				page.locator(`[data-testid="workspace-content-${sharedWorkspace.id}"]`)
			).toBeVisible()
		})
	})

	test.describe('Collapsible Workspace Sections', () => {
		test('should toggle workspace sections open and closed', async ({
			authenticatedPage,
			testData,
			testUser,
		}) => {
			const workspace = await testData.createWorkspace({
				ownerId: testUser.id,
				name: `Toggle Workspace ${Date.now()}`,
			})
			const page = authenticatedPage
			await page.goto('/dashboard')

			const workspaceSection = page.locator(`[data-testid="workspace-content-${workspace.id}"]`)
			await expect(workspaceSection).toBeVisible()

			const slugifiedName = workspace.name
				.toLowerCase()
				.replace(/\s+/g, '-')
				.replace(/[^a-z0-9-]/g, '')
			const toggleButton = page.locator(`[data-testid="toggle-workspace-${slugifiedName}"]`)
			await toggleButton.click()
			await expect(workspaceSection).toBeHidden()

			await toggleButton.click()
			await expect(workspaceSection).toBeVisible()
		})
	})

	test.describe('Workspace CRUD from Dashboard', () => {
		test.skip('should create new workspace and see it in dashboard', async ({
			authenticatedPage,
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

			// Should navigate to the new workspace
			await page.waitForURL(/\/workspace\/[a-f0-9-]+/, { timeout: 10000 })

			// Navigate back to dashboard to verify it's in the list
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Should see the new workspace in the list
			const workspaceList = page.locator('[data-testid="workspace-list"]')
			await expect(workspaceList).toContainText(workspaceName, { timeout: 10000 })
		})

		test('should rename workspace from dashboard', async ({ authenticatedPage }) => {
			const page = authenticatedPage
			const originalName = `Original ${Date.now()}`
			const newName = `Renamed ${Date.now()}`

			// Create a workspace
			await page.goto('/dashboard')
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', originalName)
			await page.click('[data-testid="confirm-create-workspace"]')

			// Wait for navigation to workspace
			await page.waitForURL(/\/workspace\/[a-f0-9-]+/, { timeout: 10000 })

			// Navigate back to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			await expect(
				page.locator('[data-testid^="workspace-item-"]').filter({ hasText: originalName }).first()
			).toBeVisible({ timeout: 10000 })

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

				// Should see new name
				await expect(page.locator('[data-testid="workspace-list"]')).toContainText(newName)
				await expect(page.locator('[data-testid="workspace-list"]')).not.toContainText(originalName)
			}
		})

		test('should delete workspace from dashboard and it disappears immediately', async ({
			authenticatedPage,
		}) => {
			const page = authenticatedPage
			const workspaceName = `Delete Test ${Date.now()}`

			// Create a workspace
			await page.goto('/dashboard')
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)
			await page.click('[data-testid="confirm-create-workspace"]')

			// Wait for navigation to workspace
			await page.waitForURL(/\/workspace\/[a-f0-9-]+/, { timeout: 10000 })

			// Navigate back to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			await expect(
				page.locator('[data-testid^="workspace-item-"]').filter({ hasText: workspaceName }).first()
			).toBeVisible({ timeout: 10000 })

			// Verify it exists
			await expect(page.locator('[data-testid="workspace-list"]')).toContainText(workspaceName, {
				timeout: 10000,
			})

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

				// Should no longer see the workspace
				await expect(page.locator('[data-testid="workspace-list"]')).not.toContainText(
					workspaceName
				)
			}
		})
	})

	test.describe('Recent Documents Display (NAV-07)', () => {
		test('should display empty state when user has no recent documents', async ({
			page,
			supabaseAdmin,
		}) => {
			const email = `recent-empty-${Date.now()}@example.com`
			const password = 'TestPassword123!'

			// Sign up new user
			await page.goto('/signup')
			await page.fill('[data-testid="name-input"]', 'New User')
			await page.fill('[data-testid="email-input"]', email)
			await page.fill('[data-testid="password-input"]', password)
			await page.click('[data-testid="signup-button"]')
			await page.waitForURL('**/dashboard**')

			// Should show empty state for recent documents
			await expect(page.locator('text=No recent documents')).toBeVisible()

			// Cleanup
			const { data } = await supabaseAdmin.auth.admin.listUsers()
			const user = data.users.find((u) => u.email === email)
			if (user) {
				await supabaseAdmin.auth.admin.deleteUser(user.id)
			}
		})

		test('should track document access and display in recent documents list', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a document
			const docName = `Recent Test Doc ${Date.now()}`

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			expect(workspace).toBeTruthy()

			// Create document via API
			const { data: doc } = await supabaseAdmin
				.from('documents')
				.insert({
					workspace_id: workspace!.id,
					name: docName,
					created_by: testUser.id,
					sharing_mode: 'private',
				})
				.select()
				.single()

			expect(doc).toBeTruthy()

			// Manually log document access (since we don't have a document view page yet)
			await supabaseAdmin.from('document_access_log').insert({
				document_id: doc!.id,
				user_id: testUser.id,
				workspace_id: workspace!.id,
			})

			// Go to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Should see the document in recent documents
			const recentList = page.locator('[data-testid="recent-documents-list"]')
			await expect(recentList).toBeVisible({ timeout: 10000 })
			await expect(recentList).toContainText(docName, { timeout: 10000 })
		})

		test('should show most recently accessed documents first', async ({
			authenticatedPage,
			supabaseAdmin,
			testData,
			testUser,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Create three documents
			const doc1Name = `First Doc ${Date.now()}`
			const doc2Name = `Second Doc ${Date.now()}`
			const doc3Name = `Third Doc ${Date.now()}`
			const now = Date.now()
			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: doc1Name,
				logAccessForUserId: testUser.id,
				accessedAt: new Date(now - 3000).toISOString(),
			})
			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: doc2Name,
				logAccessForUserId: testUser.id,
				accessedAt: new Date(now - 2000).toISOString(),
			})
			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: doc3Name,
				logAccessForUserId: testUser.id,
				accessedAt: new Date(now - 1000).toISOString(),
			})

			// Go to dashboard
			await page.goto('/dashboard')

			// Get all recent document items
			const recentItems = page.locator('[data-testid^="recent-document-"]')
			const count = await recentItems.count()
			expect(count).toBeGreaterThanOrEqual(3)

			// Most recent (doc3) should be first
			const firstItem = recentItems.first()
			await expect(firstItem).toContainText(doc3Name)
		})

		test('should remove document from recent list when access is revoked', async ({
			supabaseAdmin,
			testData,
			testUser,
			browser,
		}) => {
			const workspace = await testData.createWorkspace({
				ownerId: testUser.id,
				name: `Recent Revoke Test ${Date.now()}`,
				isPrivate: false,
			})

			const docName = `Revoke Test Doc ${Date.now()}`
			const document = await testData.createDocument({
				workspaceId: workspace.id,
				createdBy: testUser.id,
				name: docName,
			})

			const memberEmail = `recent-revoke-${Date.now()}@example.com`
			const { data: memberAuth, error: memberError } = await supabaseAdmin.auth.admin.createUser({
				email: memberEmail,
				password: 'TestPassword123!',
				email_confirm: true,
				user_metadata: {
					display_name: 'Second User',
					name: 'Second User',
				},
			})

			if (memberError || !memberAuth?.user?.id) {
				throw new Error(
					`Failed to create secondary user: ${memberError?.message ?? 'Unknown error'}`
				)
			}

			const memberId = memberAuth.user.id
			await testData.addWorkspaceMember(workspace.id, memberId)

			await supabaseAdmin.from('document_access_log').insert({
				document_id: document.id,
				workspace_id: workspace.id,
				user_id: memberId,
			})

			const memberContext = await browser.newContext({ storageState: undefined })
			const memberPage = await memberContext.newPage()
			await memberPage.goto('/login')
			await memberPage.fill('[data-testid="email-input"]', memberEmail)
			await memberPage.fill('[data-testid="password-input"]', 'TestPassword123!')
			await memberPage.click('[data-testid="login-button"]')
			await memberPage.waitForURL('**/dashboard**')

			const recentList = memberPage.locator('[data-testid="recent-documents-list"]')
			await expect(recentList).toContainText(docName, { timeout: 10000 })

			await supabaseAdmin
				.from('workspace_members')
				.delete()
				.eq('workspace_id', workspace.id)
				.eq('user_id', memberId)

			await memberPage.reload()
			await memberPage.waitForLoadState('networkidle')

			// After access is revoked, either the list doesn't exist or doesn't contain the doc
			const listExists = (await recentList.count()) > 0
			if (listExists) {
				await expect(recentList).not.toContainText(docName, { timeout: 10000 })
			} else {
				// List doesn't exist, which means no recent documents - success!
				await expect(memberPage.getByText('No recent documents')).toBeVisible({ timeout: 10000 })
			}

			await memberContext.close()
			await cleanupUserData(supabaseAdmin, memberId)
			await supabaseAdmin.auth.admin.deleteUser(memberId)
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		})

		test('should update recent list when reopening an existing recent document', async ({
			authenticatedPage,
			supabaseAdmin,
			testData,
			testUser,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Create two documents
			const doc1Name = `Reopen Test 1 ${Date.now()}`
			const doc2Name = `Reopen Test 2 ${Date.now()}`

			const baseTime = Date.now()
			const doc1 = await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: doc1Name,
				logAccessForUserId: testUser.id,
				accessedAt: new Date(baseTime - 2000).toISOString(),
			})
			const _doc2 = await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: doc2Name,
				logAccessForUserId: testUser.id,
				accessedAt: new Date(baseTime - 1000).toISOString(),
			})

			// Go to dashboard - doc2 should be first
			await page.goto('/dashboard')
			const recentItems = page.locator('[data-testid^="recent-document-"]')
			const firstItem = recentItems.first()
			await expect(firstItem).toContainText(doc2Name)

			// Log doc1 access again (reopening it)
			await supabaseAdmin.from('document_access_log').insert({
				document_id: doc1.id,
				user_id: testUser.id,
				workspace_id: workspace!.id,
				accessed_at: new Date().toISOString(),
			})

			// Go back to dashboard - doc1 should now be first
			await page.goto('/dashboard')
			const updatedItems = page.locator('[data-testid^="recent-document-"]')
			const newFirstItem = updatedItems.first()
			await expect(newFirstItem).toContainText(doc1Name)
		})

		test('should display workspace context for each recent document', async ({
			authenticatedPage,
			testData,
			testUser,
		}) => {
			const page = authenticatedPage

			const workspaceName = `Context Test ${Date.now()}`
			const workspace = await testData.createWorkspace({
				ownerId: testUser.id,
				name: workspaceName,
			})

			const docName = `Context Doc ${Date.now()}`
			const doc = await testData.createDocument({
				workspaceId: workspace.id,
				createdBy: testUser.id,
				name: docName,
				logAccessForUserId: testUser.id,
			})

			// Go to dashboard
			await page.goto('/dashboard')

			// Find the recent document item
			const recentItem = page.locator(`[data-testid="recent-document-${doc.id}"]`)
			await expect(recentItem).toBeVisible()

			// Should show document name
			await expect(recentItem).toContainText(docName)

			// Should show workspace name as context
			await expect(recentItem).toContainText(workspaceName)
		})
	})

	test.describe('Dashboard Data Updates', () => {
		test('should reflect workspace removal when user is removed from workspace', async ({
			supabaseAdmin,
			testData,
			testUser,
			browser,
		}) => {
			const workspaceName = `Shared Test ${Date.now()}`
			const workspace = await testData.createWorkspace({
				ownerId: testUser.id,
				name: workspaceName,
				isPrivate: false,
			})

			const secondUserEmail = `dashboard-test-${Date.now()}@example.com`
			const { data: memberAuth, error: memberError } = await supabaseAdmin.auth.admin.createUser({
				email: secondUserEmail,
				password: 'TestPassword123!',
				email_confirm: true,
				user_metadata: {
					display_name: 'Second User',
					name: 'Second User',
				},
			})

			if (memberError || !memberAuth?.user?.id) {
				throw new Error(
					`Failed to create secondary user: ${memberError?.message ?? 'Unknown error'}`
				)
			}

			const memberId = memberAuth.user.id
			await testData.addWorkspaceMember(workspace.id, memberId)

			const memberContext = await browser.newContext({ storageState: undefined })
			const memberPage = await memberContext.newPage()
			await memberPage.goto('/login')
			await memberPage.fill('[data-testid="email-input"]', secondUserEmail)
			await memberPage.fill('[data-testid="password-input"]', 'TestPassword123!')
			await memberPage.click('[data-testid="login-button"]')
			await memberPage.waitForURL('**/dashboard**')

			const workspaceList = memberPage.locator('[data-testid="workspace-list"]')
			await expect(workspaceList).toContainText(workspaceName)

			await supabaseAdmin
				.from('workspace_members')
				.delete()
				.eq('workspace_id', workspace.id)
				.eq('user_id', memberId)

			await memberPage.reload()
			await expect(workspaceList).not.toContainText(workspaceName)

			await memberContext.close()
			await cleanupUserData(supabaseAdmin, memberId)
			await supabaseAdmin.auth.admin.deleteUser(memberId)
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
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
