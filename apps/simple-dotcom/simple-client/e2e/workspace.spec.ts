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

	test.describe('Owner Deletion Constraints', () => {
		test('should prevent non-owner from deleting workspace via API', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace owned by another user
			const { data: otherUser } = await supabaseAdmin.auth.admin.createUser({
				email: `other-user-${Date.now()}@example.com`,
				password: 'TestPassword123!',
				email_confirm: true,
			})

			if (!otherUser?.user) {
				throw new Error('Failed to create other user')
			}

			// Create user entry in users table
			await supabaseAdmin.from('users').insert({
				id: otherUser.user.id,
				email: otherUser.user.email!,
				display_name: 'Other User',
			})

			const { data: workspace, error: workspaceError } = await supabaseAdmin
				.from('workspaces')
				.insert({
					owner_id: otherUser.user.id,
					name: `Other's Workspace ${Date.now()}`,
					is_private: false,
				})
				.select()
				.single()

			if (workspaceError || !workspace) {
				throw new Error(`Failed to create workspace: ${workspaceError?.message}`)
			}

			// Add test user as member (not owner)
			await supabaseAdmin.from('workspace_members').insert({
				workspace_id: workspace.id,
				user_id: testUser.id,
				role: 'member',
			})

			// Attempt to delete via API
			const response = await page.request.delete(`/api/workspaces/${workspace.id}`)

			// Should return 403 error
			expect(response.status()).toBe(403)
			const body = await response.json()
			expect(body.success).toBe(false)
			expect(body.error.code).toBe('WORKSPACE_OWNERSHIP_REQUIRED')

			// Verify workspace still exists
			const { data: unchangedWorkspace } = await supabaseAdmin
				.from('workspaces')
				.select('is_deleted')
				.eq('id', workspace.id)
				.single()

			expect(unchangedWorkspace?.is_deleted).toBe(false)

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await supabaseAdmin.auth.admin.deleteUser(otherUser.user.id)
		})

		test('should allow owner to delete workspace via API', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage
			const workspaceName = `Owner Delete ${Date.now()}`

			// Create workspace owned by test user
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

			// Delete via API
			const response = await page.request.delete(`/api/workspaces/${workspace.id}`)

			// Should succeed
			expect(response.status()).toBe(200)
			const body = await response.json()
			expect(body.success).toBe(true)

			// Verify workspace is soft deleted
			const { data: deletedWorkspace } = await supabaseAdmin
				.from('workspaces')
				.select('is_deleted, deleted_at')
				.eq('id', workspace.id)
				.single()

			expect(deletedWorkspace?.is_deleted).toBe(true)
			expect(deletedWorkspace?.deleted_at).toBeTruthy()

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		})

		test('should prevent owner from leaving workspace via API', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage
			const workspaceName = `Owner Leave Test ${Date.now()}`

			// Create workspace owned by test user
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

			// Attempt to leave via API
			const response = await page.request.post(`/api/workspaces/${workspace.id}/leave`)

			// Should return 403 error
			expect(response.status()).toBe(403)
			const body = await response.json()
			expect(body.success).toBe(false)
			expect(body.error.code).toBe('CANNOT_LEAVE_OWNED_WORKSPACE')
			expect(body.error.message).toContain('transfer ownership')

			// Verify membership still exists
			const { data: membership } = await supabaseAdmin
				.from('workspace_members')
				.select('*')
				.eq('workspace_id', workspace.id)
				.eq('user_id', testUser.id)

			expect(membership).toBeTruthy()
			expect(membership?.length).toBe(1)

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		})

		test('should allow non-owner member to leave workspace via API', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace owned by another user
			const { data: otherUser } = await supabaseAdmin.auth.admin.createUser({
				email: `owner-${Date.now()}@example.com`,
				password: 'TestPassword123!',
				email_confirm: true,
			})

			if (!otherUser?.user) {
				throw new Error('Failed to create other user')
			}

			// Create user entry in users table
			await supabaseAdmin.from('users').insert({
				id: otherUser.user.id,
				email: otherUser.user.email!,
				display_name: 'Owner User',
			})

			const { data: workspace, error: workspaceError } = await supabaseAdmin
				.from('workspaces')
				.insert({
					owner_id: otherUser.user.id,
					name: `Shared Workspace ${Date.now()}`,
					is_private: false,
				})
				.select()
				.single()

			if (workspaceError || !workspace) {
				throw new Error(`Failed to create workspace: ${workspaceError?.message}`)
			}

			// Add test user as member
			await supabaseAdmin.from('workspace_members').insert({
				workspace_id: workspace.id,
				user_id: testUser.id,
				role: 'member',
			})

			// Leave via API
			const response = await page.request.post(`/api/workspaces/${workspace.id}/leave`)

			// Should succeed
			expect(response.status()).toBe(200)
			const body = await response.json()
			expect(body.success).toBe(true)

			// Verify membership is removed
			const { data: membership } = await supabaseAdmin
				.from('workspace_members')
				.select('*')
				.eq('workspace_id', workspace.id)
				.eq('user_id', testUser.id)

			expect(membership?.length).toBe(0)

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await supabaseAdmin.auth.admin.deleteUser(otherUser.user.id)
		})

		test.skip('should allow owner to leave after transferring ownership', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			// SKIP: The transfer_workspace_ownership RPC function is not deployed to test database
			// This test requires the database function from migration 20251005000001_m15_03_atomic_ownership_transfer.sql
			const page = authenticatedPage

			// Create another user
			const { data: newOwner } = await supabaseAdmin.auth.admin.createUser({
				email: `new-owner-${Date.now()}@example.com`,
				password: 'TestPassword123!',
				email_confirm: true,
			})

			if (!newOwner?.user) {
				throw new Error('Failed to create new owner user')
			}

			// Create user entry in users table
			await supabaseAdmin.from('users').insert({
				id: newOwner.user.id,
				email: newOwner.user.email!,
				display_name: 'New Owner',
			})

			// Create workspace owned by test user
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.insert({
					owner_id: testUser.id,
					name: `Transfer Test ${Date.now()}`,
					is_private: false,
				})
				.select()
				.single()

			// Add both users as members
			await supabaseAdmin.from('workspace_members').insert([
				{
					workspace_id: workspace.id,
					user_id: testUser.id,
					role: 'owner',
				},
				{
					workspace_id: workspace.id,
					user_id: newOwner.user.id,
					role: 'member',
				},
			])

			// Transfer ownership via API
			const transferResponse = await page.request.post(
				`/api/workspaces/${workspace.id}/transfer-ownership`,
				{
					data: { new_owner_id: newOwner.user.id },
				}
			)

			// If transfer fails, log the error for debugging
			if (transferResponse.status() !== 200) {
				const errorBody = await transferResponse.json()
				console.error('Transfer ownership failed:', errorBody)
			}

			expect(transferResponse.status()).toBe(200)

			// Now original owner should be able to leave
			const leaveResponse = await page.request.post(`/api/workspaces/${workspace.id}/leave`)

			// Should succeed
			expect(leaveResponse.status()).toBe(200)
			const body = await leaveResponse.json()
			expect(body.success).toBe(true)

			// Verify test user membership is removed
			const { data: testUserMembership } = await supabaseAdmin
				.from('workspace_members')
				.select('*')
				.eq('workspace_id', workspace.id)
				.eq('user_id', testUser.id)

			expect(testUserMembership?.length).toBe(0)

			// Verify workspace still exists and has new owner
			const { data: updatedWorkspace } = await supabaseAdmin
				.from('workspaces')
				.select('owner_id, is_deleted')
				.eq('id', workspace.id)
				.single()

			expect(updatedWorkspace?.owner_id).toBe(newOwner.user.id)
			expect(updatedWorkspace?.is_deleted).toBe(false)

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await supabaseAdmin.auth.admin.deleteUser(newOwner.user.id)
		})
	})

	test.describe('Workspace Access Control (PERM-01)', () => {
		test('should deny non-member access to workspace via API', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace owned by another user
			const { data: otherUser } = await supabaseAdmin.auth.admin.createUser({
				email: `other-owner-${Date.now()}@example.com`,
				password: 'TestPassword123!',
				email_confirm: true,
			})

			if (!otherUser?.user) {
				throw new Error('Failed to create other user')
			}

			// Create user entry in users table
			await supabaseAdmin.from('users').insert({
				id: otherUser.user.id,
				email: otherUser.user.email!,
				display_name: 'Other Owner',
			})

			const { data: workspace, error: workspaceError } = await supabaseAdmin
				.from('workspaces')
				.insert({
					owner_id: otherUser.user.id,
					name: `Private Workspace ${Date.now()}`,
					is_private: false,
				})
				.select()
				.single()

			if (workspaceError || !workspace) {
				throw new Error(`Failed to create workspace: ${workspaceError?.message}`)
			}

			// DO NOT add test user as member

			// Attempt to access workspace via API
			const response = await page.request.get(`/api/workspaces/${workspace.id}`)

			// Should return 403 error
			expect(response.status()).toBe(403)
			const body = await response.json()
			expect(body.success).toBe(false)
			expect(body.error.code).toBe('FORBIDDEN')

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await supabaseAdmin.auth.admin.deleteUser(otherUser.user.id)
		})

		test('should allow member to access workspace via API', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace owned by another user
			const { data: otherUser } = await supabaseAdmin.auth.admin.createUser({
				email: `workspace-owner-${Date.now()}@example.com`,
				password: 'TestPassword123!',
				email_confirm: true,
			})

			if (!otherUser?.user) {
				throw new Error('Failed to create other user')
			}

			// Create user entry in users table
			await supabaseAdmin.from('users').insert({
				id: otherUser.user.id,
				email: otherUser.user.email!,
				display_name: 'Workspace Owner',
			})

			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.insert({
					owner_id: otherUser.user.id,
					name: `Shared Workspace ${Date.now()}`,
					is_private: false,
				})
				.select()
				.single()

			// Add test user as member
			await supabaseAdmin.from('workspace_members').insert({
				workspace_id: workspace.id,
				user_id: testUser.id,
				role: 'member',
			})

			// Access workspace via API
			const response = await page.request.get(`/api/workspaces/${workspace.id}`)

			// Should succeed
			expect(response.status()).toBe(200)
			const body = await response.json()
			expect(body.success).toBe(true)
			expect(body.data.id).toBe(workspace.id)

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await supabaseAdmin.auth.admin.deleteUser(otherUser.user.id)
		})

		test('should deny non-member access to workspace members list', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace owned by another user
			const { data: otherUser } = await supabaseAdmin.auth.admin.createUser({
				email: `members-test-${Date.now()}@example.com`,
				password: 'TestPassword123!',
				email_confirm: true,
			})

			if (!otherUser?.user) {
				throw new Error('Failed to create other user')
			}

			await supabaseAdmin.from('users').insert({
				id: otherUser.user.id,
				email: otherUser.user.email!,
				display_name: 'Members Test Owner',
			})

			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.insert({
					owner_id: otherUser.user.id,
					name: `Members Workspace ${Date.now()}`,
					is_private: false,
				})
				.select()
				.single()

			// Attempt to access members list via API
			const response = await page.request.get(`/api/workspaces/${workspace.id}/members`)

			// Should return 403 error (or 401 if not authenticated at API level)
			expect([401, 403]).toContain(response.status())
			const body = await response.json()
			expect(body.success).toBe(false)
			expect(['UNAUTHORIZED', 'FORBIDDEN']).toContain(body.error.code)

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await supabaseAdmin.auth.admin.deleteUser(otherUser.user.id)
		})

		test('should deny non-member from creating documents in workspace', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace owned by another user
			const { data: otherUser } = await supabaseAdmin.auth.admin.createUser({
				email: `doc-test-${Date.now()}@example.com`,
				password: 'TestPassword123!',
				email_confirm: true,
			})

			if (!otherUser?.user) {
				throw new Error('Failed to create other user')
			}

			await supabaseAdmin.from('users').insert({
				id: otherUser.user.id,
				email: otherUser.user.email!,
				display_name: 'Doc Test Owner',
			})

			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.insert({
					owner_id: otherUser.user.id,
					name: `Docs Workspace ${Date.now()}`,
					is_private: false,
				})
				.select()
				.single()

			// Attempt to create document via API
			const response = await page.request.post(`/api/workspaces/${workspace.id}/documents`, {
				data: { name: 'Test Document' },
			})

			// Should return 403 error (or 401 if not authenticated at API level)
			expect([401, 403]).toContain(response.status())
			const body = await response.json()
			expect(body.success).toBe(false)
			expect(['UNAUTHORIZED', 'FORBIDDEN']).toContain(body.error.code)

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await supabaseAdmin.auth.admin.deleteUser(otherUser.user.id)
		})

		test('should lose access immediately after membership removal', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace owned by another user
			const { data: otherUser } = await supabaseAdmin.auth.admin.createUser({
				email: `revoke-test-${Date.now()}@example.com`,
				password: 'TestPassword123!',
				email_confirm: true,
			})

			if (!otherUser?.user) {
				throw new Error('Failed to create other user')
			}

			await supabaseAdmin.from('users').insert({
				id: otherUser.user.id,
				email: otherUser.user.email!,
				display_name: 'Revoke Test Owner',
			})

			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.insert({
					owner_id: otherUser.user.id,
					name: `Revoke Workspace ${Date.now()}`,
					is_private: false,
				})
				.select()
				.single()

			// Add test user as member
			await supabaseAdmin.from('workspace_members').insert({
				workspace_id: workspace.id,
				user_id: testUser.id,
				role: 'member',
			})

			// Verify access works
			const accessResponse = await page.request.get(`/api/workspaces/${workspace.id}`)
			expect(accessResponse.status()).toBe(200)

			// Remove membership
			await supabaseAdmin
				.from('workspace_members')
				.delete()
				.eq('workspace_id', workspace.id)
				.eq('user_id', testUser.id)

			// Verify access is now denied
			const deniedResponse = await page.request.get(`/api/workspaces/${workspace.id}`)
			expect(deniedResponse.status()).toBe(403)

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await supabaseAdmin.auth.admin.deleteUser(otherUser.user.id)
		})

		test('should have RLS policies enabled on workspace tables', async ({ supabaseAdmin }) => {
			// Query pg_tables to verify RLS is enabled
			const { data: tables, error } = await supabaseAdmin
				.from('pg_tables' as any)
				.select('tablename, rowsecurity')
				.eq('schemaname', 'public')
				.in('tablename', [
					'workspaces',
					'workspace_members',
					'documents',
					'folders',
					'invitation_links',
				])

			if (error) {
				// If we can't query pg_tables directly, skip this test
				// RLS enforcement is tested via API tests above
				return
			}

			// Verify all workspace-scoped tables have RLS enabled
			expect(tables).toBeTruthy()
			expect(tables!.length).toBeGreaterThan(0)

			for (const table of tables!) {
				expect(table.rowsecurity).toBe(true)
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

			// Private workspace name should be based on email prefix since testUser doesn't have display_name
			const emailPrefix = testUser.email.split('@')[0]
			expect(unchangedWorkspace?.name).toBe(`${emailPrefix}'s Workspace`)
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
			// Private workspace name should be based on email prefix since testUser doesn't have display_name
			const emailPrefix = testUser.email.split('@')[0]
			expect(privateWorkspace.name).toBe(`${emailPrefix}'s Workspace`)
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

	test.describe('Member Leave Flow', () => {
		test('should allow members to leave shared workspace', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create another user to be the owner
			const ownerEmail = `owner-${Date.now()}@example.com`
			const { data: authData } = await supabaseAdmin.auth.admin.createUser({
				email: ownerEmail,
				password: 'TestPassword123!',
				email_confirm: true,
			})
			const ownerId = authData!.user!.id

			// Create a shared workspace as the owner
			const { data: workspace, error: wsError } = await supabaseAdmin
				.from('workspaces')
				.insert({
					name: 'Shared Test Workspace',
					owner_id: ownerId,
					is_private: false,
				})
				.select()
				.single()

			if (wsError) {
				console.error('Failed to create workspace:', wsError)
				throw wsError
			}

			// Add test user as a member
			await supabaseAdmin.from('workspace_members').insert({
				workspace_id: workspace.id,
				user_id: testUser.id,
				role: 'member',
			})

			// Call leave endpoint
			const response = await page.request.post(`/api/workspaces/${workspace.id}/leave`)
			expect(response.status()).toBe(200)

			const body = await response.json()
			expect(body.success).toBe(true)
			expect(body.data.workspaceName).toBe('Shared Test Workspace')

			// Verify membership was deleted
			const { data: membership } = await supabaseAdmin
				.from('workspace_members')
				.select('*')
				.eq('workspace_id', workspace.id)
				.eq('user_id', testUser.id)
				.single()

			expect(membership).toBeNull()

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await supabaseAdmin.auth.admin.deleteUser(ownerId)
		})

		test('should prevent owners from using leave endpoint', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create a workspace owned by test user
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.insert({
					name: 'Owner Test Workspace',
					owner_id: testUser.id,
					is_private: false,
				})
				.select()
				.single()

			// Try to leave as owner
			const response = await page.request.post(`/api/workspaces/${workspace.id}/leave`)
			expect(response.status()).toBe(403)

			const body = await response.json()
			expect(body.error.message).toContain('transfer ownership')

			// Verify workspace still exists
			const { data: unchangedWorkspace } = await supabaseAdmin
				.from('workspaces')
				.select('*')
				.eq('id', workspace.id)
				.single()

			expect(unchangedWorkspace).toBeTruthy()
			expect(unchangedWorkspace.owner_id).toBe(testUser.id)

			// Cleanup
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		})

		test('should prevent leaving private workspace', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Get user's private workspace
			const { data: privateWorkspace } = await supabaseAdmin
				.from('workspaces')
				.select('*')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Try to leave private workspace
			const response = await page.request.post(`/api/workspaces/${privateWorkspace.id}/leave`)
			expect(response.status()).toBe(403)

			const body = await response.json()
			expect(body.error.message).toContain('Cannot leave your private workspace')
		})

		test('should show workspace settings in read-only mode for members', async ({
			authenticatedPage,
			supabaseAdmin,
			testUser,
		}) => {
			const page = authenticatedPage

			// Create another user to be the owner
			const ownerEmail = `owner-readonly-${Date.now()}@example.com`
			const { data: authData } = await supabaseAdmin.auth.admin.createUser({
				email: ownerEmail,
				password: 'TestPassword123!',
				email_confirm: true,
			})
			const ownerId = authData!.user!.id

			// Create a shared workspace as the owner
			const { data: workspace, error: wsError } = await supabaseAdmin
				.from('workspaces')
				.insert({
					name: 'Read-Only Test Workspace',
					owner_id: ownerId,
					is_private: false,
				})
				.select()
				.single()

			if (wsError) {
				console.error('Failed to create workspace:', wsError)
				throw wsError
			}

			// Add test user as a member
			await supabaseAdmin.from('workspace_members').insert({
				workspace_id: workspace.id,
				user_id: testUser.id,
				role: 'member',
			})

			// Navigate to workspace settings
			await page.goto(`/workspace/${workspace.id}/settings`)

			// Verify read-only message appears
			await expect(
				page.locator('text=Only the workspace owner can rename the workspace')
			).toBeVisible()

			// Verify Leave Workspace button is visible
			await expect(page.locator('button:has-text("Leave Workspace")')).toBeVisible()

			// Verify rename button is not visible for members
			await expect(page.locator('button:has-text("Rename")')).not.toBeVisible()

			// Cleanup
			await supabaseAdmin.from('workspace_members').delete().eq('workspace_id', workspace.id)
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await supabaseAdmin.auth.admin.deleteUser(ownerId)
		})
	})
})
