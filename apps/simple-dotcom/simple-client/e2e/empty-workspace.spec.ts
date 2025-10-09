import { expect, test } from './fixtures/test-fixtures'

/**
 * Helper function to cleanup non-private workspaces for test isolation
 */
async function cleanupNonPrivateWorkspaces(supabaseAdmin: any, testUserId: string) {
	// Delete all non-private workspaces owned by testUser
	const { data: ownedWorkspaces } = await supabaseAdmin
		.from('workspaces')
		.select('id, is_private')
		.eq('owner_id', testUserId)

	if (ownedWorkspaces) {
		for (const workspace of ownedWorkspaces) {
			if (!workspace.is_private) {
				await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			}
		}
	}

	// Remove from any workspaces where user is a member but not owner
	const { data: memberWorkspaces } = await supabaseAdmin
		.from('workspace_members')
		.select('workspace_id, workspace:workspaces!inner(id, is_private, owner_id)')
		.eq('user_id', testUserId)

	if (memberWorkspaces) {
		for (const membership of memberWorkspaces) {
			const workspace = Array.isArray(membership.workspace)
				? membership.workspace[0]
				: membership.workspace

			if (!workspace.is_private && workspace.owner_id !== testUserId) {
				await supabaseAdmin
					.from('workspace_members')
					.delete()
					.eq('workspace_id', workspace.id)
					.eq('user_id', testUserId)
			}
		}
	}
}

test.describe('Empty Workspace List Handling (M15-02)', () => {
	test('should handle users with only private workspace', async ({
		testUser,
		authenticatedPage: page,
		supabaseAdmin,
	}) => {
		// Cleanup to ensure test isolation
		await cleanupNonPrivateWorkspaces(supabaseAdmin, testUser.id)

		// Navigate to dashboard
		await page.goto('/dashboard')

		// UI assertions
		await expect(page.locator('[data-testid="workspace-list"]')).toBeVisible()

		const workspaceItems = page.locator('[data-testid^="workspace-item-"]')
		const count = await workspaceItems.count()
		expect(count).toBe(1) // User should always have their private workspace

		await expect(page.locator('text=/Playwright Worker.*Workspace/i').first()).toBeVisible()
		await expect(page.locator('text=/error|500|crash/i')).not.toBeVisible()

		const title = await page.title()
		expect(title).toContain('tldraw')

		// API assertions
		const response = await page.request.get('/api/dashboard')
		expect(response.ok()).toBeTruthy()

		const data = await response.json()
		expect(data.success).toBe(true)
		expect(data.data.workspaces).toHaveLength(1)
		expect(data.data.workspaces[0].workspace.is_private).toBe(true)
		expect(data.data.workspaces[0].workspace.name).toMatch(/Playwright Worker \d+'s Workspace/)

		// Verify private workspace cannot be deleted (by checking database state)
		const { data: privateWorkspace } = await supabaseAdmin
			.from('workspaces')
			.select('*')
			.eq('owner_id', testUser.id)
			.eq('is_private', true)
			.single()

		expect(privateWorkspace).toBeDefined()
		expect(privateWorkspace.is_deleted).toBe(false)

		// Verify rename button doesn't exist for private workspace
		const renameButton = page.locator(`[data-testid="rename-workspace-${privateWorkspace.id}"]`)
		await expect(renameButton).not.toBeVisible()
	})
})
