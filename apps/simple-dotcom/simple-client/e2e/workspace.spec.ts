import { expect, test } from './fixtures/test-fixtures'

/**
 * Workspace Management Tests
 *
 * NOTE: Most workspace tests are currently skipped because the workspace UI
 * is not yet implemented. Only basic dashboard access is tested.
 *
 * The following features are NOT yet implemented and their tests are skipped:
 * - Workspace provisioning on signup
 * - Workspace CRUD operations
 * - Workspace listing and navigation
 * - Owner constraints and safeguards
 * - Private workspace access enforcement
 *
 * These tests should be re-enabled as workspace features are built in:
 * - WS-01: Shared workspace CRUD
 * - WS-02: Owner deletion constraints
 * - PERM-01: Workspace access control
 */
test.describe('Workspace Management', () => {
	test.describe('Dashboard Access', () => {
		test('should redirect to dashboard after signup', async ({ page, supabaseAdmin }) => {
			const email = `test-workspace-${Date.now()}@example.com`
			const password = 'TestPassword123!'
			const name = 'Test User'

			await page.goto('/signup')

			// Sign up a new user
			await page.fill('[data-testid="name-input"]', name)
			await page.fill('[data-testid="email-input"]', email)
			await page.fill('[data-testid="password-input"]', password)
			await page.click('[data-testid="signup-button"]')

			// Should redirect to dashboard
			await page.waitForURL('**/dashboard**')
			expect(page.url()).toContain('/dashboard')

			// Cleanup
			const { data } = await supabaseAdmin.auth.admin.listUsers()
			const user = data.users.find((u: { email?: string }) => u.email === email)
			if (user) {
				await supabaseAdmin.auth.admin.deleteUser(user.id)
			}
		})

		test('should display dashboard content for authenticated user', async ({
			authenticatedPage,
		}) => {
			const page = authenticatedPage

			// Should be on dashboard
			expect(page.url()).toContain('/dashboard')

			// Should display dashboard heading and user greeting
			await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
			await expect(page.locator('text=Welcome,')).toBeVisible()
		})
	})

	test.describe('Workspace Creation', () => {
		test('should create a new shared workspace from dashboard', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage
			const workspaceName = `Test Workspace ${Date.now()}`

			// Click create workspace button
			await page.click('[data-testid="create-workspace-button"]')

			// Fill in workspace name
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)

			// Wait for API response and confirm creation
			const responsePromise = page.waitForResponse(
				(response) =>
					response.url().includes('/api/workspaces') && response.request().method() === 'POST'
			)
			await page.click('[data-testid="confirm-create-workspace"]')
			const response = await responsePromise

			// Debug: log response details if not successful
			if (response.status() !== 201) {
				const body = await response.json()
				console.log('API Error:', response.status(), body)
			}

			// Verify API response was successful
			expect(response.status()).toBe(201)

			// Wait for modal to close
			await page.waitForSelector('[data-testid="workspace-name-input"]', {
				state: 'hidden',
				timeout: 10000,
			})

			// Verify workspace appears in UI
			const workspaceText = page.locator(`text=${workspaceName}`)
			await expect(workspaceText).toBeVisible()

			// Verify workspace was created in database
			const { data: workspaces } = await supabaseAdmin
				.from('workspaces')
				.select('*')
				.eq('owner_id', testUser.id)
				.eq('name', workspaceName)
				.eq('is_private', false)

			expect(workspaces).toBeTruthy()
			expect(workspaces?.length).toBe(1)
			expect(workspaces![0].is_deleted).toBe(false)

			// Cleanup
			if (workspaces && workspaces.length > 0) {
				await supabaseAdmin.from('workspaces').delete().eq('id', workspaces[0].id)
			}
		})

		test('should validate workspace name is required', async ({ authenticatedPage }) => {
			const page = authenticatedPage

			// Click create workspace button
			await page.click('[data-testid="create-workspace-button"]')

			// Try to create without entering name
			const createButton = page.locator('[data-testid="confirm-create-workspace"]')
			await expect(createButton).toBeDisabled()
		})

		test('should add owner as workspace member on creation', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage
			const workspaceName = `Member Test ${Date.now()}`

			// Create workspace
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', workspaceName)

			const responsePromise = page.waitForResponse(
				(response) =>
					response.url().includes('/api/workspaces') && response.request().method() === 'POST'
			)
			await page.click('[data-testid="confirm-create-workspace"]')
			await responsePromise

			await page.waitForSelector('[data-testid="workspace-name-input"]', {
				state: 'hidden',
				timeout: 10000,
			})

			// Get workspace from database
			const { data: workspaces } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('name', workspaceName)
				.single()

			expect(workspaces).toBeTruthy()

			// Verify owner is added as member with owner role
			const { data: members } = await supabaseAdmin
				.from('workspace_members')
				.select('*')
				.eq('workspace_id', workspaces?.id)
				.eq('user_id', testUser.id)

			expect(members).toBeTruthy()
			expect(members?.length).toBe(1)
			expect(members![0].role).toBe('owner')

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspaces?.id)
		})
	})

	test.describe('Workspace Rename', () => {
		test('should rename a shared workspace', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage
			const originalName = `Original ${Date.now()}`
			const newName = `Renamed ${Date.now()}`

			// Create a workspace first
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.insert({
					owner_id: testUser.id,
					name: originalName,
					is_private: false,
				})
				.select()
				.single()

			expect(workspace).toBeTruthy()

			// Add owner as member
			await supabaseAdmin.from('workspace_members').insert({
				workspace_id: workspace.id,
				user_id: testUser.id,
				role: 'owner',
			})

			// Reload page to see new workspace
			await page.reload()
			await page.waitForLoadState('networkidle')

			// Click rename button
			await page.click(`[data-testid="rename-workspace-${workspace.id}"]`)

			// Enter new name
			await page.fill('[data-testid="rename-workspace-input"]', newName)

			// Confirm rename
			await page.click('[data-testid="confirm-rename-workspace"]')

			// Wait for modal to close
			await page.waitForSelector('[data-testid="rename-workspace-input"]', { state: 'hidden' })

			// Verify new name appears in UI
			await expect(page.locator(`text=${newName}`)).toBeVisible()
			await expect(page.locator(`text=${originalName}`)).not.toBeVisible()

			// Verify name was updated in database
			const { data: updated } = await supabaseAdmin
				.from('workspaces')
				.select('name')
				.eq('id', workspace.id)
				.single()

			expect(updated?.name).toBe(newName)

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		})

		test('should not show rename button for private workspaces', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: privateWorkspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			expect(privateWorkspace).toBeTruthy()

			// Reload to ensure UI is up to date
			await page.reload()
			await page.waitForLoadState('networkidle')

			// Verify rename button doesn't exist for private workspace
			const renameButton = page.locator(`[data-testid="rename-workspace-${privateWorkspace?.id}"]`)
			await expect(renameButton).not.toBeVisible()

			// Verify "Cannot modify" text is shown
			const workspaceItem = page.locator(`[data-testid="workspace-item-${privateWorkspace?.id}"]`)
			await expect(workspaceItem.locator('text=(Cannot modify)')).toBeVisible()
		})

		test('should persist rename across page reload', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage
			const originalName = `Persist Test ${Date.now()}`
			const newName = `Persisted ${Date.now()}`

			// Create workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.insert({
					owner_id: testUser.id,
					name: originalName,
					is_private: false,
				})
				.select()
				.single()

			await supabaseAdmin.from('workspace_members').insert({
				workspace_id: workspace.id,
				user_id: testUser.id,
				role: 'owner',
			})

			// Reload and rename
			await page.reload()
			await page.waitForLoadState('networkidle')
			await page.click(`[data-testid="rename-workspace-${workspace.id}"]`)
			await page.fill('[data-testid="rename-workspace-input"]', newName)
			await page.click('[data-testid="confirm-rename-workspace"]')
			await page.waitForSelector('[data-testid="rename-workspace-input"]', { state: 'hidden' })

			// Reload page again
			await page.reload()
			await page.waitForLoadState('networkidle')

			// Verify new name still appears
			await expect(page.locator(`text=${newName}`)).toBeVisible()

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		})
	})

	test.describe('Workspace Soft Deletion', () => {
		test('should soft delete a shared workspace', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage
			const workspaceName = `Delete Test ${Date.now()}`

			// Create workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.insert({
					owner_id: testUser.id,
					name: workspaceName,
					is_private: false,
				})
				.select()
				.single()

			await supabaseAdmin.from('workspace_members').insert({
				workspace_id: workspace.id,
				user_id: testUser.id,
				role: 'owner',
			})

			// Reload page
			await page.reload()
			await page.waitForLoadState('networkidle')

			// Click delete button
			await page.click(`[data-testid="delete-workspace-${workspace.id}"]`)

			// Verify confirmation dialog appears
			await expect(page.locator('text=Are you sure you want to delete')).toBeVisible()
			await expect(page.locator(`text="${workspaceName}"`)).toBeVisible()

			// Confirm deletion
			await page.click('[data-testid="confirm-delete-workspace"]')

			// Wait for modal to close
			await page.waitForSelector('[data-testid="confirm-delete-workspace"]', { state: 'hidden' })

			// Verify workspace removed from UI
			await expect(page.locator(`text=${workspaceName}`)).not.toBeVisible()

			// Verify workspace is soft deleted in database
			const { data: deleted } = await supabaseAdmin
				.from('workspaces')
				.select('is_deleted, deleted_at')
				.eq('id', workspace.id)
				.single()

			expect(deleted?.is_deleted).toBe(true)
			expect(deleted?.deleted_at).toBeTruthy()

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		})

		test('should not show delete button for private workspaces', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: privateWorkspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			expect(privateWorkspace).toBeTruthy()

			// Reload to ensure UI is up to date
			await page.reload()
			await page.waitForLoadState('networkidle')

			// Verify delete button doesn't exist for private workspace
			const deleteButton = page.locator(`[data-testid="delete-workspace-${privateWorkspace?.id}"]`)
			await expect(deleteButton).not.toBeVisible()
		})

		test('should remove workspace from listings after soft delete', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage
			const workspaceName = `Listing Test ${Date.now()}`

			// Create workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.insert({
					owner_id: testUser.id,
					name: workspaceName,
					is_private: false,
				})
				.select()
				.single()

			await supabaseAdmin.from('workspace_members').insert({
				workspace_id: workspace.id,
				user_id: testUser.id,
				role: 'owner',
			})

			// Reload and verify workspace is visible
			await page.reload()
			await page.waitForLoadState('networkidle')
			await expect(page.locator(`text=${workspaceName}`)).toBeVisible()

			// Delete workspace
			await page.click(`[data-testid="delete-workspace-${workspace.id}"]`)
			await page.click('[data-testid="confirm-delete-workspace"]')
			await page.waitForSelector('[data-testid="confirm-delete-workspace"]', { state: 'hidden' })

			// Reload page
			await page.reload()
			await page.waitForLoadState('networkidle')

			// Verify workspace is not in list
			await expect(page.locator(`text=${workspaceName}`)).not.toBeVisible()

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		})
	})

	test.describe('Workspace Permissions', () => {
		test('should only show rename/delete for owner', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Get user's owned workspaces
			const { data: ownedWorkspaces } = await supabaseAdmin
				.from('workspaces')
				.select('id, is_private')
				.eq('owner_id', testUser.id)

			expect(ownedWorkspaces).toBeTruthy()

			// Reload page
			await page.reload()
			await page.waitForLoadState('networkidle')

			// Verify buttons exist for shared workspaces owned by user
			for (const workspace of ownedWorkspaces || []) {
				if (!workspace.is_private) {
					await expect(
						page.locator(`[data-testid="rename-workspace-${workspace.id}"]`)
					).toBeVisible()
					await expect(
						page.locator(`[data-testid="delete-workspace-${workspace.id}"]`)
					).toBeVisible()
				}
			}
		})
	})

	test.describe('Private Workspace Validation', () => {
		test('should prevent renaming private workspace via API', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Get the user's private workspace
			const { data: workspaces } = await supabaseAdmin
				.from('workspaces')
				.select('*')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			expect(workspaces).toBeTruthy()
			const privateWorkspaceId = workspaces.id

			// Attempt to rename via API
			const response = await page.request.patch(`/api/workspaces/${privateWorkspaceId}`, {
				data: { name: 'Renamed Private Workspace' },
			})

			// Should return 403 error
			expect(response.status()).toBe(403)
			const body = await response.json()
			expect(body.success).toBe(false)
			expect(body.error.code).toBe('CANNOT_RENAME_PRIVATE_WORKSPACE')

			// Verify workspace name hasn't changed
			const { data: unchangedWorkspace } = await supabaseAdmin
				.from('workspaces')
				.select('name')
				.eq('id', privateWorkspaceId)
				.single()

			expect(unchangedWorkspace?.name).toBe('My Private Workspace')
		})

		test('should prevent deleting private workspace via API', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Get the user's private workspace
			const { data: workspaces } = await supabaseAdmin
				.from('workspaces')
				.select('*')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			expect(workspaces).toBeTruthy()
			const privateWorkspaceId = workspaces.id

			// Attempt to delete via API
			const response = await page.request.delete(`/api/workspaces/${privateWorkspaceId}`)

			// Should return 403 error
			expect(response.status()).toBe(403)
			const body = await response.json()
			expect(body.success).toBe(false)
			expect(body.error.code).toBe('CANNOT_DELETE_PRIVATE_WORKSPACE')

			// Verify workspace still exists and is not soft deleted
			const { data: unchangedWorkspace } = await supabaseAdmin
				.from('workspaces')
				.select('is_deleted')
				.eq('id', privateWorkspaceId)
				.single()

			expect(unchangedWorkspace?.is_deleted).toBe(false)
		})

		test('should verify private workspace created on signup', async ({
			supabaseAdmin,
			testUser,
		}) => {
			// Verify the user has exactly one private workspace
			const { data: privateWorkspaces } = await supabaseAdmin
				.from('workspaces')
				.select('*')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)

			expect(privateWorkspaces).toBeTruthy()
			expect(privateWorkspaces?.length).toBe(1)

			const privateWorkspace = privateWorkspaces![0]
			expect(privateWorkspace.name).toBe('My Private Workspace')
			expect(privateWorkspace.is_deleted).toBe(false)
			expect(privateWorkspace.owner_id).toBe(testUser.id)
		})

		test('should enforce immutability guarantees for private workspaces', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Get the user's private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('*')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			expect(workspace).toBeTruthy()
			const privateWorkspaceId = workspace.id
			const originalName = workspace.name

			// Test 1: Cannot rename via API
			const renameResponse = await page.request.patch(`/api/workspaces/${privateWorkspaceId}`, {
				data: { name: 'Attempt Rename' },
			})
			expect(renameResponse.status()).toBe(403)

			// Test 2: Cannot delete via API
			const deleteResponse = await page.request.delete(`/api/workspaces/${privateWorkspaceId}`)
			expect(deleteResponse.status()).toBe(403)

			// Verify workspace is unchanged
			const { data: finalWorkspace } = await supabaseAdmin
				.from('workspaces')
				.select('name, is_deleted')
				.eq('id', privateWorkspaceId)
				.single()

			expect(finalWorkspace?.name).toBe(originalName)
			expect(finalWorkspace?.is_deleted).toBe(false)
		})
	})
})
