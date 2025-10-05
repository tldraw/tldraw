import { expect, test } from './fixtures/test-fixtures'

test.describe('Ownership Transfer', () => {
	test('owner can transfer ownership to another member', async ({ page, supabaseAdmin }) => {
		// Create two users for the test
		const ownerEmail = `owner-${Date.now()}@example.com`
		const memberEmail = `member-${Date.now()}@example.com`
		const password = 'TestPassword123!'

		// Sign up the owner
		await page.goto('/signup')
		await page.fill('[data-testid="name-input"]', 'Owner User')
		await page.fill('[data-testid="email-input"]', ownerEmail)
		await page.fill('[data-testid="password-input"]', password)
		await page.click('[data-testid="signup-button"]')
		await page.waitForURL('**/dashboard**')

		// Get owner's user ID
		const { data: ownerData } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', ownerEmail)
			.single()
		const ownerId = ownerData?.id

		// Create a workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'visible' })
		await page.fill('[data-testid="workspace-name-input"]', 'Transfer Test Workspace')
		await page.click('[data-testid="confirm-create-workspace"]')
		await page.waitForTimeout(1000)

		// Get the workspace ID
		const { data: workspaceData } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('owner_id', ownerId)
			.eq('name', 'Transfer Test Workspace')
			.single()
		const workspaceId = workspaceData?.id

		// Logout and create member user
		await page.goto('/logout')
		await page.goto('/signup')
		await page.fill('[data-testid="name-input"]', 'Member User')
		await page.fill('[data-testid="email-input"]', memberEmail)
		await page.fill('[data-testid="password-input"]', password)
		await page.click('[data-testid="signup-button"]')
		await page.waitForURL('**/dashboard**')

		// Get member's user ID
		const { data: memberData } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', memberEmail)
			.single()
		const memberId = memberData?.id

		// Add member to workspace directly via database
		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: workspaceId,
			user_id: memberId,
			role: 'member',
		})

		// Logout and login as owner again
		await page.goto('/logout')
		await page.goto('/login')
		await page.fill('[data-testid="email-input"]', ownerEmail)
		await page.fill('[data-testid="password-input"]', password)
		await page.click('[data-testid="login-button"]')
		await page.waitForURL('**/dashboard**')

		// Navigate to workspace settings
		await page.goto(`/workspace/${workspaceId}/settings`)
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
		await page.waitForURL(`**/workspace/${workspaceId}`)

		// Verify ownership was transferred in database
		const { data: updatedWorkspace } = await supabaseAdmin
			.from('workspaces')
			.select('owner_id')
			.eq('id', workspaceId)
			.single()

		expect(updatedWorkspace?.owner_id).toBe(memberId)

		// Verify role changes
		const { data: ownerMembership } = await supabaseAdmin
			.from('workspace_members')
			.select('role')
			.eq('workspace_id', workspaceId)
			.eq('user_id', ownerId)
			.single()

		const { data: memberMembership } = await supabaseAdmin
			.from('workspace_members')
			.select('role')
			.eq('workspace_id', workspaceId)
			.eq('user_id', memberId)
			.single()

		expect(ownerMembership?.role).toBe('member')
		expect(memberMembership?.role).toBe('owner')

		// Cleanup
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
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

	test('members cannot see ownership transfer section', async ({ page, supabaseAdmin }) => {
		// Create owner user
		const ownerEmail = `owner2-${Date.now()}@example.com`
		const memberEmail = `member2-${Date.now()}@example.com`
		const password = 'TestPassword123!'

		// Sign up owner
		await page.goto('/signup')
		await page.fill('[data-testid="name-input"]', 'Owner User 2')
		await page.fill('[data-testid="email-input"]', ownerEmail)
		await page.fill('[data-testid="password-input"]', password)
		await page.click('[data-testid="signup-button"]')
		await page.waitForURL('**/dashboard**')

		// Get owner ID and create workspace
		const { data: ownerData } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', ownerEmail)
			.single()

		await page.click('[data-testid="create-workspace-button"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'visible' })
		await page.fill('[data-testid="workspace-name-input"]', 'Member Test Workspace')
		await page.click('[data-testid="confirm-create-workspace"]')
		await page.waitForTimeout(1000)

		const { data: workspaceData } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('owner_id', ownerData?.id)
			.eq('name', 'Member Test Workspace')
			.single()

		// Create member user
		await page.goto('/logout')
		await page.goto('/signup')
		await page.fill('[data-testid="name-input"]', 'Member User 2')
		await page.fill('[data-testid="email-input"]', memberEmail)
		await page.fill('[data-testid="password-input"]', password)
		await page.click('[data-testid="signup-button"]')
		await page.waitForURL('**/dashboard**')

		// Get member ID and add to workspace
		const { data: memberData } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', memberEmail)
			.single()

		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: workspaceData?.id,
			user_id: memberData?.id,
			role: 'member',
		})

		// Navigate to workspace settings as member
		await page.goto(`/workspace/${workspaceData?.id}/settings`)

		// Transfer section should not be visible
		const transferSection = page.locator('section:has-text("Transfer Ownership")')
		await expect(transferSection).not.toBeVisible()

		// Member should see leave option
		await expect(page.locator('button:has-text("Leave Workspace")')).toBeVisible()

		// Cleanup
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceData?.id)
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
	}) => {
		// Create a workspace without other members
		await authenticatedPage.goto('/dashboard')
		await authenticatedPage.click('[data-testid="create-workspace-button"]')
		await authenticatedPage.waitForSelector('[data-testid="workspace-name-input"]', {
			state: 'visible',
		})
		await authenticatedPage.fill('[data-testid="workspace-name-input"]', 'Solo Workspace')
		await authenticatedPage.click('[data-testid="confirm-create-workspace"]')
		await authenticatedPage.waitForTimeout(1000)

		// Get workspace ID
		const { data: userData } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', testUser.email)
			.single()

		const { data: workspaceData } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('owner_id', userData?.id)
			.eq('name', 'Solo Workspace')
			.single()

		// Navigate to workspace settings
		await authenticatedPage.goto(`/workspace/${workspaceData?.id}/settings`)

		// Transfer section should not exist (no other members)
		const transferSection = authenticatedPage.locator('section:has-text("Transfer Ownership")')
		await expect(transferSection).not.toBeVisible()

		// Cleanup
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceData?.id)
	})
})
