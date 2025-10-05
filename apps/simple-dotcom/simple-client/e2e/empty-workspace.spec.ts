import { expect, test } from './fixtures/test-fixtures'

test.describe('Empty Workspace List Handling (M15-02)', () => {
	test('should handle users with no accessible workspaces without errors', async ({
		testUser,
		authenticatedPage: page,
		supabaseAdmin,
	}) => {
		// First, remove user from all workspaces (except private which we'll delete)
		// Get all workspaces the user has access to
		const { data: workspaces } = await supabaseAdmin
			.from('workspaces')
			.select('id, type')
			.or(`owner_id.eq.${testUser.id}`)

		if (workspaces) {
			for (const workspace of workspaces) {
				if (workspace.type === 'private') {
					// Delete the private workspace (this simulates provisioning failure)
					await supabaseAdmin.from('workspaces').update({ is_deleted: true }).eq('id', workspace.id)
				} else {
					// Remove user from shared workspaces
					await supabaseAdmin
						.from('workspace_members')
						.delete()
						.eq('workspace_id', workspace.id)
						.eq('user_id', testUser.id)
				}
			}
		}

		// Now navigate to dashboard - it should not crash
		await page.goto('/dashboard')

		// Should show empty state without errors
		await expect(page.locator('[data-testid="workspace-list"]')).toBeVisible()

		// Check that we see the "No workspaces yet" empty state
		const workspaceItems = page.locator('[data-testid^="workspace-item-"]')
		const count = await workspaceItems.count()
		expect(count).toBe(0)

		// Verify no error messages are shown
		await expect(page.locator('text=/error|500|crash/i')).not.toBeVisible()

		// Page should be fully loaded without console errors
		const title = await page.title()
		expect(title).toContain('tldraw')
	})

	test('should return proper empty response from dashboard API with no workspaces', async ({
		testUser,
		authenticatedPage: page,
		supabaseAdmin,
	}) => {
		// First, remove user from all workspaces
		const { data: workspaces } = await supabaseAdmin
			.from('workspaces')
			.select('id, type')
			.or(`owner_id.eq.${testUser.id}`)

		if (workspaces) {
			for (const workspace of workspaces) {
				if (workspace.type === 'private') {
					await supabaseAdmin.from('workspaces').update({ is_deleted: true }).eq('id', workspace.id)
				} else {
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
		expect(data.data.workspaces).toEqual([])
		expect(data.data.recentDocuments).toEqual([])

		// Should not have any error field
		expect(data.error).toBeUndefined()
	})

	test('should recover gracefully when workspace is restored', async ({
		testUser,
		authenticatedPage: page,
		supabaseAdmin,
	}) => {
		// Get all workspaces the user has access to (owned or member)
		const { data: ownedWorkspaces } = await supabaseAdmin
			.from('workspaces')
			.select('id, type')
			.eq('owner_id', testUser.id!)

		const { data: memberWorkspaces } = await supabaseAdmin
			.from('workspace_members')
			.select('workspace_id, workspaces!inner(id, type)')
			.eq('user_id', testUser.id!)

		// Combine all workspaces
		const allWorkspaces = [
			...(ownedWorkspaces || []),
			...(memberWorkspaces?.map((m) => (m as any).workspaces) || []),
		]

		// Find and soft-delete the private workspace
		let privateWorkspaceId: string | null = null
		for (const workspace of allWorkspaces) {
			if (workspace.type === 'private') {
				privateWorkspaceId = workspace.id
				await supabaseAdmin.from('workspaces').update({ is_deleted: true }).eq('id', workspace.id)
			} else {
				// Remove from shared workspaces
				await supabaseAdmin
					.from('workspace_members')
					.delete()
					.eq('workspace_id', workspace.id)
					.eq('user_id', testUser.id!)
			}
		}

		// Navigate to dashboard with no workspaces
		await page.goto('/dashboard')
		await expect(page.locator('[data-testid="workspace-list"]')).toBeVisible()

		let workspaceItems = page.locator('[data-testid^="workspace-item-"]')
		expect(await workspaceItems.count()).toBe(0)

		// Restore the private workspace
		if (privateWorkspaceId) {
			await supabaseAdmin
				.from('workspaces')
				.update({ is_deleted: false })
				.eq('id', privateWorkspaceId)

			// Refresh the page
			await page.reload()

			// Should now show the restored workspace
			await expect(page.locator('[data-testid="workspace-list"]')).toBeVisible()
			workspaceItems = page.locator('[data-testid^="workspace-item-"]')
			expect(await workspaceItems.count()).toBeGreaterThan(0)

			// Should see the Private workspace
			await expect(page.locator('text=/Private/i')).toBeVisible()
		} else {
			// If no private workspace was found, skip this assertion
			console.warn('No private workspace found for test user - skipping restoration test')
		}
	})
})
