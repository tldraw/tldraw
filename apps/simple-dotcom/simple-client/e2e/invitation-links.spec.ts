import { expect } from '@playwright/test'
import { test } from './fixtures/test-fixtures'

test.describe('Invitation Links', () => {
	test('owner can create invitation link', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage

		// Create a shared workspace for testing
		const workspaceName = `Test Workspace ${Date.now()}`
		const { data: workspace, error } = await supabaseAdmin
			.from('workspaces')
			.insert({
				name: workspaceName,
				owner_id: testUser.id,
				is_private: false,
			})
			.select()
			.single()

		if (error) throw error
		const workspaceId = workspace.id

		// Add owner to workspace_members
		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: workspaceId,
			user_id: testUser.id,
			role: 'owner',
		})

		// Navigate to workspace settings
		await page.goto(`/workspace/${workspaceId}/settings`)
		await page.waitForLoadState('networkidle')

		// Check invitation link section exists
		await expect(page.getByRole('heading', { name: 'Invitation Link' })).toBeVisible()

		// Check initial state - link is disabled by default
		await expect(page.getByText('Status:')).toBeVisible({ timeout: 5000 })
		await expect(page.getByText('Disabled')).toBeVisible()

		// Enable invitation link
		await page.getByRole('button', { name: 'Enable Link' }).click()

		// Wait for link to be enabled
		await expect(page.getByText('Enabled')).toBeVisible({ timeout: 5000 })

		// Check that the invitation URL is displayed
		const inviteInput = page.locator('input[readonly]').first()
		await expect(inviteInput).toBeVisible()
		const inviteUrl = await inviteInput.inputValue()
		expect(inviteUrl).toContain('/invite/')

		// Clean up
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('owner can copy invitation link to clipboard', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
		context,
	}) => {
		const page = authenticatedPage

		// Grant clipboard permissions
		await context.grantPermissions(['clipboard-read', 'clipboard-write'])

		// Create a shared workspace with invitation link
		const workspaceName = `Test Workspace ${Date.now()}`
		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.insert({
				name: workspaceName,
				owner_id: testUser.id,
				is_private: false,
			})
			.select()
			.single()

		const workspaceId = workspace!.id

		// Add owner to workspace_members
		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: workspaceId,
			user_id: testUser.id,
			role: 'owner',
		})

		// Create invitation link
		const token = crypto.randomUUID()
		await supabaseAdmin.from('invitation_links').insert({
			workspace_id: workspaceId,
			token,
			enabled: true,
			created_by: testUser.id,
		})

		// Navigate to workspace settings
		await page.goto(`/workspace/${workspaceId}/settings`)
		await page.waitForLoadState('networkidle')

		// Wait for invitation link to load
		await expect(page.getByText('Status:')).toBeVisible({ timeout: 5000 })

		// Copy link
		await page.getByRole('button', { name: 'Copy' }).click()

		// Check copy success feedback
		await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible()

		// Verify clipboard content
		const inviteInput = page.locator('input[readonly]').first()
		const expectedUrl = await inviteInput.inputValue()
		const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
		expect(clipboardText).toBe(expectedUrl)

		// Clean up
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('owner can disable and enable invitation link', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage

		// Create a shared workspace with invitation link
		const workspaceName = `Test Workspace ${Date.now()}`
		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.insert({
				name: workspaceName,
				owner_id: testUser.id,
				is_private: false,
			})
			.select()
			.single()

		const workspaceId = workspace!.id

		// Add owner to workspace_members
		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: workspaceId,
			user_id: testUser.id,
			role: 'owner',
		})

		// Create invitation link
		const token = crypto.randomUUID()
		await supabaseAdmin.from('invitation_links').insert({
			workspace_id: workspaceId,
			token,
			enabled: true,
			created_by: testUser.id,
		})

		// Navigate to workspace settings
		await page.goto(`/workspace/${workspaceId}/settings`)
		await page.waitForLoadState('networkidle')

		// Wait for invitation link to load
		await expect(page.getByText('Status:')).toBeVisible({ timeout: 5000 })
		await expect(page.getByText('Enabled')).toBeVisible()

		// Disable link
		await page.getByRole('button', { name: 'Disable Link' }).click()

		// Check that link is disabled
		await expect(page.getByText('Disabled')).toBeVisible({ timeout: 5000 })

		// Check that the URL is no longer visible
		await expect(page.locator('input[readonly]')).not.toBeVisible()

		// Enable link again
		await page.getByRole('button', { name: 'Enable Link' }).click()

		// Check that link is enabled
		await expect(page.getByText('Enabled')).toBeVisible({ timeout: 5000 })

		// Check that the URL is visible again
		const inviteInput = page.locator('input[readonly]').first()
		await expect(inviteInput).toBeVisible()

		// Clean up
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('owner can regenerate invitation link', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage

		// Create a shared workspace with invitation link
		const workspaceName = `Test Workspace ${Date.now()}`
		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.insert({
				name: workspaceName,
				owner_id: testUser.id,
				is_private: false,
			})
			.select()
			.single()

		const workspaceId = workspace!.id

		// Add owner to workspace_members
		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: workspaceId,
			user_id: testUser.id,
			role: 'owner',
		})

		// Create invitation link
		const token = crypto.randomUUID()
		await supabaseAdmin.from('invitation_links').insert({
			workspace_id: workspaceId,
			token,
			enabled: true,
			created_by: testUser.id,
		})

		// Navigate to workspace settings
		await page.goto(`/workspace/${workspaceId}/settings`)
		await page.waitForLoadState('networkidle')

		// Wait for invitation link to load
		await expect(page.getByText('Status:')).toBeVisible({ timeout: 5000 })

		// Get original URL
		const inviteInput = page.locator('input[readonly]').first()
		const originalUrl = await inviteInput.inputValue()

		// Click regenerate (will trigger confirmation dialog)
		page.on('dialog', (dialog) => dialog.accept())
		await page.getByRole('button', { name: 'Regenerate Link' }).click()

		// Wait for regeneration to complete
		await page.waitForTimeout(1000)

		// Get new URL
		const newUrl = await inviteInput.inputValue()

		// URLs should be different (different token)
		expect(newUrl).not.toBe(originalUrl)
		expect(newUrl).toContain('/invite/')

		// Clean up
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('non-owner cannot see invitation management UI', async ({
		page,
		supabaseAdmin,
		testUser,
	}) => {
		// Create another test user for member role
		const memberEmail = `member-${Date.now()}@test.com`
		const memberPassword = 'TestPass123!'

		const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
			email: memberEmail,
			password: memberPassword,
			email_confirm: true,
		})

		if (authError) throw authError
		const memberId = authData.user!.id

		// Create profile for member
		await supabaseAdmin.from('users').insert({
			id: memberId,
			email: memberEmail,
		})

		// Create a shared workspace
		const workspaceName = `Test Workspace ${Date.now()}`
		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.insert({
				name: workspaceName,
				owner_id: testUser.id,
				is_private: false,
			})
			.select()
			.single()

		const workspaceId = workspace!.id

		// Add owner to workspace_members
		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: workspaceId,
			user_id: testUser.id,
			role: 'owner',
		})

		// Add member to workspace
		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: workspaceId,
			user_id: memberId,
			role: 'member',
		})

		// Sign in as member
		await page.goto('/auth/signin')
		await page.fill('input[type="email"]', memberEmail)
		await page.fill('input[type="password"]', memberPassword)
		await page.click('button[type="submit"]')
		await page.waitForURL('/dashboard')

		// Navigate to workspace settings
		await page.goto(`/workspace/${workspaceId}/settings`)
		await page.waitForLoadState('networkidle')

		// Check that invitation link section is not visible
		await expect(page.getByRole('heading', { name: 'Invitation Link' })).not.toBeVisible()

		// Member should see workspace type but not invitation management
		await expect(page.getByRole('heading', { name: 'Workspace Type' })).toBeVisible()

		// Clean up
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
		await supabaseAdmin.auth.admin.deleteUser(memberId)
	})

	test('handles network errors gracefully', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage

		// Create a shared workspace with invitation link
		const workspaceName = `Test Workspace ${Date.now()}`
		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.insert({
				name: workspaceName,
				owner_id: testUser.id,
				is_private: false,
			})
			.select()
			.single()

		const workspaceId = workspace!.id

		// Add owner to workspace_members
		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: workspaceId,
			user_id: testUser.id,
			role: 'owner',
		})

		// Create invitation link
		const token = crypto.randomUUID()
		await supabaseAdmin.from('invitation_links').insert({
			workspace_id: workspaceId,
			token,
			enabled: true,
			created_by: testUser.id,
		})

		// Navigate to workspace settings
		await page.goto(`/workspace/${workspaceId}/settings`)
		await page.waitForLoadState('networkidle')

		// Wait for invitation link to load
		await expect(page.getByText('Status:')).toBeVisible({ timeout: 5000 })

		// Intercept and fail the toggle request
		await page.route('**/api/workspaces/*/invite', (route) => {
			route.abort('failed')
		})

		// Try to toggle link
		await page.getByRole('button', { name: /Disable Link|Enable Link/ }).click()

		// Should show error message
		await expect(page.getByText(/Failed to toggle invitation link/)).toBeVisible({ timeout: 5000 })

		// Clean up
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})
})
