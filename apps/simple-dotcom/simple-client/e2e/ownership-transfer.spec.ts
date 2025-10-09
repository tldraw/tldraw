import { expect, test } from './fixtures/test-fixtures'

test.describe('Ownership Transfer', () => {
	test('owner can transfer ownership to another member', async ({
		page,
		supabaseAdmin,
		testData,
	}) => {
		// Create two users for the test
		const ownerEmail = `owner-${Date.now()}@example.com`
		const memberEmail = `member-${Date.now()}@example.com`
		const password = 'TestPassword123!'

		// Provision users via Supabase admin API to skip UI signup flows
		const { data: ownerAuth, error: ownerError } = await supabaseAdmin.auth.admin.createUser({
			email: ownerEmail,
			password,
			email_confirm: true,
			user_metadata: { name: 'Owner User' },
		})
		if (ownerError) throw ownerError
		const ownerId = ownerAuth?.user?.id

		const { data: memberAuth, error: memberError } = await supabaseAdmin.auth.admin.createUser({
			email: memberEmail,
			password,
			email_confirm: true,
			user_metadata: { name: 'Member User' },
		})
		if (memberError) throw memberError
		const memberId = memberAuth?.user?.id

		if (!ownerId || !memberId) {
			throw new Error('Failed to provision test users for ownership transfer test')
		}

		// Create workspace and add member without touching the UI
		const workspace = await testData.createWorkspace({
			ownerId,
			name: 'Transfer Test Workspace',
			members: [{ userId: memberId, role: 'member' }],
		})

		// Login as owner via UI to perform the transfer
		await page.goto('/login')
		await page.fill('[data-testid="email-input"]', ownerEmail)
		await page.fill('[data-testid="password-input"]', password)
		await page.click('[data-testid="login-button"]')
		await page.waitForURL('**/dashboard**')

		// Navigate to workspace settings
		await page.goto(`/workspace/${workspace.id}/settings`)
		await expect(page.locator('h1')).toContainText('Workspace Settings')

		// Check ownership transfer section exists
		const transferSection = page.locator('section:has-text("Transfer Ownership")')
		await expect(transferSection).toBeVisible()

		// Select new owner
		await page.selectOption('select#new-owner', memberId)
		await page.click('button:has-text("Continue")')

		// Confirm transfer
		await expect(page.locator('text="Confirm ownership transfer"')).toBeVisible()
		await page.click('button:has-text("Confirm Transfer")')

		// Should redirect to workspace page
		await page.waitForURL(`**/workspace/${workspace.id}`)

		// Verify ownership was transferred in database
		const { data: updatedWorkspace } = await supabaseAdmin
			.from('workspaces')
			.select('owner_id')
			.eq('id', workspace.id)
			.single()

		expect(updatedWorkspace?.owner_id).toBe(memberId)

		// Verify role changes
		const { data: ownerMembership } = await supabaseAdmin
			.from('workspace_members')
			.select('role')
			.eq('workspace_id', workspace.id)
			.eq('user_id', ownerId)
			.single()

		const { data: memberMembership } = await supabaseAdmin
			.from('workspace_members')
			.select('role')
			.eq('workspace_id', workspace.id)
			.eq('user_id', memberId)
			.single()

		expect(ownerMembership?.role).toBe('member')
		expect(memberMembership?.role).toBe('owner')

		// Cleanup
		await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		const { data: users } = await supabaseAdmin.auth.admin.listUsers()
		for (const user of users.users) {
			if (user.email === ownerEmail || user.email === memberEmail) {
				await supabaseAdmin.auth.admin.deleteUser(user.id)
			}
		}
	})

	test('ownership transfer section not shown for private workspaces', async ({
		authenticatedPage,
		testUser,
		supabaseAdmin,
	}) => {
		// Navigate to dashboard to find private workspace
		await authenticatedPage.goto('/dashboard')

		// Get user's private workspace
		const { data: userData } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', testUser.email)
			.single()

		const { data: privateWorkspace } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('owner_id', userData?.id)
			.eq('is_private', true)
			.single()

		// Navigate to private workspace settings
		await authenticatedPage.goto(`/workspace/${privateWorkspace?.id}/settings`)

		// Transfer section should not exist
		const transferSection = authenticatedPage.locator('section:has-text("Transfer Ownership")')
		await expect(transferSection).not.toBeVisible()
	})

	test('members cannot see ownership transfer section', async ({
		page,
		supabaseAdmin,
		testData,
	}) => {
		const ownerEmail = `owner2-${Date.now()}@example.com`
		const memberEmail = `member2-${Date.now()}@example.com`
		const password = 'TestPassword123!'

		const { data: ownerAuth, error: ownerError } = await supabaseAdmin.auth.admin.createUser({
			email: ownerEmail,
			password,
			email_confirm: true,
			user_metadata: { name: 'Owner User 2' },
		})
		if (ownerError) throw ownerError
		const ownerId = ownerAuth?.user?.id

		const { data: memberAuth, error: memberError } = await supabaseAdmin.auth.admin.createUser({
			email: memberEmail,
			password,
			email_confirm: true,
			user_metadata: { name: 'Member User 2' },
		})
		if (memberError) throw memberError
		const memberId = memberAuth?.user?.id

		if (!ownerId || !memberId) {
			throw new Error('Failed to provision users for member visibility test')
		}

		const workspace = await testData.createWorkspace({
			ownerId,
			name: 'Member Test Workspace',
			members: [{ userId: memberId, role: 'member' }],
		})

		// Login as member to verify restricted UI
		await page.goto('/login')
		await page.fill('[data-testid="email-input"]', memberEmail)
		await page.fill('[data-testid="password-input"]', password)
		await page.click('[data-testid="login-button"]')
		await page.waitForURL('**/dashboard**')

		await page.goto(`/workspace/${workspace.id}/settings`)

		const transferSection = page.locator('section:has-text("Transfer Ownership")')
		await expect(transferSection).not.toBeVisible()
		await expect(page.locator('button:has-text("Leave Workspace")')).toBeVisible()

		await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		const { data: users } = await supabaseAdmin.auth.admin.listUsers()
		for (const user of users.users) {
			if (user.email === ownerEmail || user.email === memberEmail) {
				await supabaseAdmin.auth.admin.deleteUser(user.id)
			}
		}
	})

	test('cannot transfer to workspace with only one member', async ({
		authenticatedPage,
		testUser,
		supabaseAdmin,
		testData,
	}) => {
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: 'Solo Workspace',
		})

		await authenticatedPage.goto(`/workspace/${workspace.id}/settings`)

		const transferSection = authenticatedPage.locator('section:has-text("Transfer Ownership")')
		await expect(transferSection).not.toBeVisible()

		await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
	})

	test.describe('Owner Constraints', () => {
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
})
