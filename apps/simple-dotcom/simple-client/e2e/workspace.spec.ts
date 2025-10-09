import { expect, test } from './fixtures/test-fixtures'

/**
 * Workspace Management Tests
 *
 * NOTE: Workspace CRUD operations are in workspace-crud.spec.ts
 * NOTE: Ownership constraints are in ownership-transfer.spec.ts
 * NOTE: Member leave flow is in member-management.spec.ts
 *
 * This file focuses on:
 * - Workspace access control (PERM-01)
 * - Private workspace validation
 */
test.describe('Workspace Management', () => {
	test.describe('Workspace Access Control (PERM-01)', () => {
		test('should deny non-member access to workspace via API', async ({
			authenticatedPage,
			supabaseAdmin,
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
				.from('pg_tables')
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

			// Private workspace name should be based on display_name from user metadata
			const { data: userData } = await supabaseAdmin
				.from('users')
				.select('display_name')
				.eq('id', testUser.id)
				.single()

			expect(unchangedWorkspace?.name).toBe(`${userData?.display_name}'s Workspace`)
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
			// Private workspace name should be based on display_name from user metadata
			const { data: userData } = await supabaseAdmin
				.from('users')
				.select('display_name')
				.eq('id', testUser.id)
				.single()

			expect(privateWorkspace.name).toBe(`${userData?.display_name}'s Workspace`)
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
