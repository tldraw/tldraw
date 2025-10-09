import { cleanupUserData } from './fixtures/cleanup-helpers'
import { expect, test } from './fixtures/test-fixtures'

test.describe('Member Management', () => {
	test('owner can view and remove workspace members', async ({
		authenticatedPage,
		supabaseAdmin,
		testData,
		testUser,
	}) => {
		const page = authenticatedPage

		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `Members Test Workspace ${Date.now()}`,
		})

		await supabaseAdmin.from('users').update({ display_name: 'Owner User' }).eq('id', testUser.id)

		const memberEmail = `member-${Date.now()}@example.com`
		const { data: memberAuth, error: memberError } = await supabaseAdmin.auth.admin.createUser({
			email: memberEmail,
			password: 'TestPassword123!',
			email_confirm: true,
			user_metadata: {
				display_name: 'Member User',
				name: 'Member User',
			},
		})

		if (memberError || !memberAuth?.user?.id) {
			throw new Error(`Failed to create member user: ${memberError?.message ?? 'Unknown error'}`)
		}

		const memberId = memberAuth.user.id
		await testData.addWorkspaceMember(workspace.id, memberId)

		await page.goto(`/workspace/${workspace.id}/members`)
		await expect(page.getByRole('heading', { name: 'Workspace Members' })).toBeVisible()

		await expect(page.getByText('Owner User')).toBeVisible()
		await expect(page.getByText('Member User')).toBeVisible()

		page.once('dialog', (dialog) => dialog.accept())
		const memberRow = page
			.locator('div')
			.filter({ hasText: 'Member User' })
			.filter({ has: page.locator('button:has-text("Remove")') })
			.first()
		await memberRow.locator('button:has-text("Remove")').click()

		await expect(page.getByText('Member removed')).toBeVisible()
		await expect(page.getByText('Member User')).toHaveCount(0)

		await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		await cleanupUserData(supabaseAdmin, memberId)
		await supabaseAdmin.auth.admin.deleteUser(memberId)
	})

	test('search and pagination work for large member lists', async ({
		authenticatedPage,
		supabaseAdmin,
		testData,
		testUser,
	}) => {
		const page = authenticatedPage

		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `Large Team Workspace ${Date.now()}`,
		})

		await supabaseAdmin.from('users').update({ display_name: 'Owner User' }).eq('id', testUser.id)

		const memberIds: string[] = []
		for (let i = 1; i <= 15; i++) {
			const email = `member-${i}-${Date.now()}@example.com`
			const displayName = `Test Member ${i}`
			const { data, error } = await supabaseAdmin.auth.admin.createUser({
				email,
				password: 'TestPassword123!',
				email_confirm: true,
				user_metadata: {
					display_name: displayName,
					name: displayName,
				},
			})

			if (error || !data?.user?.id) {
				throw new Error(`Failed to create member ${i}: ${error?.message ?? 'Unknown error'}`)
			}

			await testData.addWorkspaceMember(workspace.id, data.user.id)
			memberIds.push(data.user.id)
		}

		await page.goto(`/workspace/${workspace.id}/members`)

		const searchInput = page.getByPlaceholder('Search members by name or email...')
		await expect(searchInput).toBeVisible()

		await searchInput.fill('Test Member 5')
		await expect(page.getByText('Found 1 member')).toBeVisible()
		await expect(page.getByText('Test Member 5')).toBeVisible()
		await expect(page.getByText('Test Member 6')).toHaveCount(0)

		await searchInput.clear()
		await expect(page.getByText('Page 1 of 2')).toBeVisible()
		await expect(page.getByText('Showing 1 to 10')).toBeVisible()

		await page.getByTestId('pagination-next').click()
		await expect(page.getByText('Page 2 of 2')).toBeVisible()
		await expect(page.getByText('Showing 11 to 16')).toBeVisible()

		await page.getByTestId('pagination-previous').click()
		await expect(page.getByText('Page 1 of 2')).toBeVisible()

		await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		for (const memberId of memberIds) {
			await cleanupUserData(supabaseAdmin, memberId)
			await supabaseAdmin.auth.admin.deleteUser(memberId)
		}
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
