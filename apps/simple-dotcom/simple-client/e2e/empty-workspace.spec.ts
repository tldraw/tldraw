import { expect, test } from './fixtures/test-fixtures'

test.describe('Empty Workspace List Handling (M15-02)', () => {
	test('should handle users with only private workspace', async ({
		testUser,
		authenticatedPage: page,
		supabaseAdmin,
	}) => {
		// Pre-cleanup: Delete all non-private workspaces owned by testUser to ensure clean state
		// This prevents data pollution from other parallel tests that may have created workspaces

		// Step 1: Delete all non-private workspaces owned by the test user
		const { data: ownedWorkspaces } = await supabaseAdmin
			.from('workspaces')
			.select('id, is_private')
			.eq('owner_id', testUser.id)

		if (ownedWorkspaces) {
			for (const workspace of ownedWorkspaces) {
				if (!workspace.is_private) {
					// Delete the workspace entirely (not just membership)
					await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
				}
			}
		}

		// Step 2: Remove from any workspaces where user is a member but not owner
		const { data: memberWorkspaces } = await supabaseAdmin
			.from('workspace_members')
			.select('workspace_id, workspace:workspaces!inner(id, is_private, owner_id)')
			.eq('user_id', testUser.id)

		if (memberWorkspaces) {
			for (const membership of memberWorkspaces) {
				const workspace = Array.isArray(membership.workspace)
					? membership.workspace[0]
					: membership.workspace

				// Only remove membership if user doesn't own it (owners already handled above)
				if (!workspace.is_private && workspace.owner_id !== testUser.id) {
					await supabaseAdmin
						.from('workspace_members')
						.delete()
						.eq('workspace_id', workspace.id)
						.eq('user_id', testUser.id)
				}
			}
		}

		// Now navigate to dashboard - it should show only the private workspace
		await page.goto('/dashboard')

		// Should show workspace list without errors
		await expect(page.locator('[data-testid="workspace-list"]')).toBeVisible()

		// Check that we see exactly one workspace (the private workspace)
		const workspaceItems = page.locator('[data-testid^="workspace-item-"]')
		const count = await workspaceItems.count()
		expect(count).toBe(1) // User should always have their private workspace

		// Verify the workspace shown is the private workspace
		// The workspace name should be based on the display_name (Playwright Worker X)
		await expect(page.locator('text=/Playwright Worker.*Workspace/i').first()).toBeVisible()

		// Verify no error messages are shown
		await expect(page.locator('text=/error|500|crash/i')).not.toBeVisible()

		// Page should be fully loaded without console errors
		const title = await page.title()
		expect(title).toContain('tldraw')
	})

	test('should return proper dashboard API response with only private workspace', async ({
		testUser,
		authenticatedPage: page,
		supabaseAdmin,
	}) => {
		// Pre-cleanup: Delete all non-private workspaces owned by testUser to ensure clean state
		// This prevents data pollution from other parallel tests that may have created workspaces

		// Step 1: Delete all non-private workspaces owned by the test user
		const { data: ownedWorkspaces } = await supabaseAdmin
			.from('workspaces')
			.select('id, is_private')
			.eq('owner_id', testUser.id)

		if (ownedWorkspaces) {
			for (const workspace of ownedWorkspaces) {
				if (!workspace.is_private) {
					// Delete the workspace entirely (not just membership)
					await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
				}
			}
		}

		// Step 2: Remove from any workspaces where user is a member but not owner
		const { data: memberWorkspaces } = await supabaseAdmin
			.from('workspace_members')
			.select('workspace_id, workspace:workspaces!inner(id, is_private, owner_id)')
			.eq('user_id', testUser.id)

		if (memberWorkspaces) {
			for (const membership of memberWorkspaces) {
				const workspace = Array.isArray(membership.workspace)
					? membership.workspace[0]
					: membership.workspace

				// Only remove membership if user doesn't own it (owners already handled above)
				if (!workspace.is_private && workspace.owner_id !== testUser.id) {
					await supabaseAdmin
						.from('workspace_members')
						.delete()
						.eq('workspace_id', workspace.id)
						.eq('user_id', testUser.id)
				}
			}
		}

		// Navigate to dashboard - we're already authenticated from fixture
		await page.goto('/dashboard')

		// Make API call to dashboard endpoint
		const response = await page.request.get('/api/dashboard')
		expect(response.ok()).toBeTruthy()

		const data = await response.json()
		expect(data.success).toBe(true)
		expect(data.data).toBeDefined()

		// Should have exactly one workspace (the private workspace)
		expect(data.data.workspaces).toHaveLength(1)
		expect(data.data.workspaces[0].workspace.is_private).toBe(true)

		// Verify the workspace name follows the expected pattern
		// testUser has display_name set to "Playwright Worker X"
		expect(data.data.workspaces[0].workspace.name).toMatch(/Playwright Worker \d+'s Workspace/)

		// Recent documents might be empty if user hasn't accessed any
		expect(data.data.recentDocuments).toBeDefined()

		// Should not have any error field
		expect(data.error).toBeUndefined()
	})

	test('should show private workspace that cannot be deleted', async ({
		testUser,
		authenticatedPage: page,
		supabaseAdmin,
	}) => {
		// Pre-cleanup: Delete all non-private workspaces owned by testUser to ensure clean state
		// This prevents data pollution from other parallel tests that may have created workspaces

		// Step 1: Delete all non-private workspaces owned by the test user
		const { data: ownedWorkspaces } = await supabaseAdmin
			.from('workspaces')
			.select('id, is_private')
			.eq('owner_id', testUser.id)

		if (ownedWorkspaces) {
			for (const workspace of ownedWorkspaces) {
				if (!workspace.is_private) {
					// Delete the workspace entirely (not just membership)
					await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
				}
			}
		}

		// Step 2: Remove from any workspaces where user is a member but not owner
		const { data: memberWorkspaces } = await supabaseAdmin
			.from('workspace_members')
			.select('workspace_id, workspace:workspaces!inner(id, is_private, owner_id)')
			.eq('user_id', testUser.id!)

		if (memberWorkspaces) {
			for (const membership of memberWorkspaces) {
				const workspace = Array.isArray(membership.workspace)
					? membership.workspace[0]
					: membership.workspace

				// Only remove membership if user doesn't own it (owners already handled above)
				if (!workspace.is_private && workspace.owner_id !== testUser.id) {
					await supabaseAdmin
						.from('workspace_members')
						.delete()
						.eq('workspace_id', workspace.id)
						.eq('user_id', testUser.id!)
				}
			}
		}

		// Create a new shared workspace to test removal
		const { data: sharedWorkspace } = await supabaseAdmin
			.from('workspaces')
			.insert({
				owner_id: testUser.id,
				name: 'Temporary Shared Workspace',
				is_private: false,
			})
			.select()
			.single()

		// Navigate to dashboard with both private and shared workspace
		await page.goto('/dashboard')
		await expect(page.locator('[data-testid="workspace-list"]')).toBeVisible()

		let workspaceItems = page.locator('[data-testid^="workspace-item-"]')
		expect(await workspaceItems.count()).toBe(2) // Private + shared

		// Remove the shared workspace
		await supabaseAdmin.from('workspaces').delete().eq('id', sharedWorkspace.id)

		// Refresh the page
		await page.reload()

		// Should still show the private workspace (which cannot be deleted)
		await expect(page.locator('[data-testid="workspace-list"]')).toBeVisible()
		workspaceItems = page.locator('[data-testid^="workspace-item-"]')
		expect(await workspaceItems.count()).toBe(1)

		// Verify it's the private workspace
		await expect(page.locator('text=/Playwright Worker.*Workspace/i').first()).toBeVisible()

		// Verify the workspace is marked as private (if there's a UI indicator)
		const { data: privateWorkspace } = await supabaseAdmin
			.from('workspaces')
			.select('*')
			.eq('owner_id', testUser.id)
			.eq('is_private', true)
			.single()

		expect(privateWorkspace).toBeDefined()
		expect(privateWorkspace.is_deleted).toBe(false)
	})
})
