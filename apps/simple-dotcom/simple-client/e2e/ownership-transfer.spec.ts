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
})
