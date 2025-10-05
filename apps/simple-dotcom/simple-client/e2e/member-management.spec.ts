import { expect, test } from './fixtures/test-fixtures'

test.describe('Member Management', () => {
	test('owner can view and remove workspace members', async ({ page, supabaseAdmin }) => {
		// Create owner user
		const ownerEmail = `owner-mem-${Date.now()}@example.com`
		const memberEmail = `member-mem-${Date.now()}@example.com`
		const password = 'TestPassword123!'

		// Sign up owner
		await page.goto('/signup')
		await page.fill('[data-testid="name-input"]', 'Owner User')
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
		await page.fill('[data-testid="workspace-name-input"]', 'Members Test Workspace')
		await page.click('[data-testid="confirm-create-workspace"]')
		await page.waitForTimeout(1000)

		const { data: workspaceData } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('owner_id', ownerData?.id)
			.eq('name', 'Members Test Workspace')
			.single()

		// Create and add member user
		await page.goto('/logout')
		await page.goto('/signup')
		await page.fill('[data-testid="name-input"]', 'Member User')
		await page.fill('[data-testid="email-input"]', memberEmail)
		await page.fill('[data-testid="password-input"]', password)
		await page.click('[data-testid="signup-button"]')
		await page.waitForURL('**/dashboard**')

		const { data: memberData } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', memberEmail)
			.single()

		// Add member to workspace
		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: workspaceData?.id,
			user_id: memberData?.id,
			role: 'member',
		})

		// Login as owner
		await page.goto('/logout')
		await page.goto('/login')
		await page.fill('[data-testid="email-input"]', ownerEmail)
		await page.fill('[data-testid="password-input"]', password)
		await page.click('[data-testid="login-button"]')
		await page.waitForURL('**/dashboard**')

		// Navigate to members page
		await page.goto(`/workspace/${workspaceData?.id}/members`)
		await expect(page.locator('h1')).toContainText('Workspace Members')

		// Verify both members are shown
		await expect(page.locator('text=Owner User')).toBeVisible()
		await expect(page.locator('text=Member User')).toBeVisible()

		// Verify role badges
		const ownerBadge = page.locator('span:has-text("Owner")').first()
		const memberBadge = page.locator('span:has-text("Member")').first()
		await expect(ownerBadge).toBeVisible()
		await expect(memberBadge).toBeVisible()

		// Remove member
		const removeMemberButton = page.locator('button:has-text("Remove")').first()
		await removeMemberButton.click()

		// Confirm in dialog
		page.on('dialog', (dialog) => dialog.accept())

		// Wait for success message
		await expect(page.locator('text="Member removed"')).toBeVisible()

		// Verify member is no longer shown
		await expect(page.locator('text="Member User"')).not.toBeVisible()

		// Cleanup
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceData?.id)
		const { data: users } = await supabaseAdmin.auth.admin.listUsers()
		for (const user of users.users) {
			if (user.email === ownerEmail || user.email === memberEmail) {
				await supabaseAdmin.auth.admin.deleteUser(user.id)
			}
		}
	})

	test('search and pagination work for large member lists', async ({ page, supabaseAdmin }) => {
		// Create owner
		const ownerEmail = `owner-search-${Date.now()}@example.com`
		const password = 'TestPassword123!'

		await page.goto('/signup')
		await page.fill('[data-testid="name-input"]', 'Owner User')
		await page.fill('[data-testid="email-input"]', ownerEmail)
		await page.fill('[data-testid="password-input"]', password)
		await page.click('[data-testid="signup-button"]')
		await page.waitForURL('**/dashboard**')

		const { data: ownerData } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', ownerEmail)
			.single()

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'visible' })
		await page.fill('[data-testid="workspace-name-input"]', 'Large Team Workspace')
		await page.click('[data-testid="confirm-create-workspace"]')
		await page.waitForTimeout(1000)

		const { data: workspaceData } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('owner_id', ownerData?.id)
			.eq('name', 'Large Team Workspace')
			.single()

		// Create 15 test members (to trigger pagination)
		const memberIds = []
		for (let i = 1; i <= 15; i++) {
			const memberEmail = `member${i}-${Date.now()}@example.com`
			const displayName = `Test Member ${i}`

			// Create user directly in database
			const { data: userData } = await supabaseAdmin
				.from('users')
				.insert({
					email: memberEmail,
					display_name: displayName,
				})
				.select()
				.single()

			// Add to workspace
			await supabaseAdmin.from('workspace_members').insert({
				workspace_id: workspaceData?.id,
				user_id: userData.id,
				role: 'member',
			})

			memberIds.push(userData.id)
		}

		// Navigate to members page
		await page.goto(`/workspace/${workspaceData?.id}/members`)

		// Search bar should be visible (more than 10 members)
		const searchInput = page.locator('input[placeholder*="Search members"]')
		await expect(searchInput).toBeVisible()

		// Test search functionality
		await searchInput.fill('Test Member 5')
		await expect(page.locator('text="Found 1 member"')).toBeVisible()
		await expect(page.locator('text="Test Member 5"')).toBeVisible()
		await expect(page.locator('text="Test Member 6"')).not.toBeVisible()

		// Clear search
		await searchInput.clear()

		// Test pagination
		await expect(page.locator('text="Page 1 of 2"')).toBeVisible()
		await expect(page.locator('text="Showing 1 to 10"')).toBeVisible()

		// Go to page 2
		await page.click('button:has-text("Next")')
		await expect(page.locator('text="Page 2 of 2"')).toBeVisible()
		await expect(page.locator('text="Showing 11 to 16"')).toBeVisible() // 15 members + 1 owner

		// Go back to page 1
		await page.click('button:has-text("Previous")')
		await expect(page.locator('text="Page 1 of 2"')).toBeVisible()

		// Cleanup
		await supabaseAdmin.from('workspace_members').delete().eq('workspace_id', workspaceData?.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceData?.id)
		for (const memberId of memberIds) {
			await supabaseAdmin.from('users').delete().eq('id', memberId)
		}
		const { data: users } = await supabaseAdmin.auth.admin.listUsers()
		const owner = users.users.find((u) => u.email === ownerEmail)
		if (owner) {
			await supabaseAdmin.auth.admin.deleteUser(owner.id)
		}
	})

	test('non-owners cannot access members page', async ({ page, supabaseAdmin }) => {
		// Create owner and member
		const ownerEmail = `owner-access-${Date.now()}@example.com`
		const memberEmail = `member-access-${Date.now()}@example.com`
		const password = 'TestPassword123!'

		// Create owner and workspace
		await page.goto('/signup')
		await page.fill('[data-testid="name-input"]', 'Owner User')
		await page.fill('[data-testid="email-input"]', ownerEmail)
		await page.fill('[data-testid="password-input"]', password)
		await page.click('[data-testid="signup-button"]')
		await page.waitForURL('**/dashboard**')

		const { data: ownerData } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', ownerEmail)
			.single()

		await page.click('[data-testid="create-workspace-button"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'visible' })
		await page.fill('[data-testid="workspace-name-input"]', 'Private Members Workspace')
		await page.click('[data-testid="confirm-create-workspace"]')
		await page.waitForTimeout(1000)

		const { data: workspaceData } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('owner_id', ownerData?.id)
			.eq('name', 'Private Members Workspace')
			.single()

		// Create member
		await page.goto('/logout')
		await page.goto('/signup')
		await page.fill('[data-testid="name-input"]', 'Member User')
		await page.fill('[data-testid="email-input"]', memberEmail)
		await page.fill('[data-testid="password-input"]', password)
		await page.click('[data-testid="signup-button"]')
		await page.waitForURL('**/dashboard**')

		const { data: memberData } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', memberEmail)
			.single()

		// Add member to workspace
		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: workspaceData?.id,
			user_id: memberData?.id,
			role: 'member',
		})

		// Try to access members page as member
		await page.goto(`/workspace/${workspaceData?.id}/members`)

		// Should redirect to 403 page
		await expect(page).toHaveURL('**/403')

		// Cleanup
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceData?.id)
		const { data: users } = await supabaseAdmin.auth.admin.listUsers()
		for (const user of users.users) {
			if (user.email === ownerEmail || user.email === memberEmail) {
				await supabaseAdmin.auth.admin.deleteUser(user.id)
			}
		}
	})
})
