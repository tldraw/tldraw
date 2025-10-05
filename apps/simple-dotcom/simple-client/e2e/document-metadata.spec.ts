import { expect, test } from './fixtures/test-fixtures'

test.describe('Document Metadata Display', () => {
	test('displays metadata for workspace members', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Metadata Test ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')

		// Wait for workspace to be created
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		// Get workspace ID from URL
		await page.waitForURL(/\/workspace\/[a-f0-9-]+/)
		const workspaceId = page.url().split('/workspace/')[1]

		// Create a document directly via Supabase
		const { data: document, error } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: 'Test Document',
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		expect(error).toBeNull()
		expect(document).toBeTruthy()

		// Navigate to the document
		await page.goto(`/d/${document.id}`)

		// Check that metadata is displayed
		await expect(page.getByText('Created by:')).toBeVisible()
		await expect(page.getByText('Created:')).toBeVisible()
		await expect(page.getByText('Last updated:')).toBeVisible()

		// The display name should be the user's email (no display name set for test users)
		await expect(page.getByText(testUser.email)).toBeVisible()

		// Verify time display (should be "just now" or similar)
		await expect(page.getByText(/just now|seconds? ago/)).toBeVisible()

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('displays limited metadata for guests with public documents', async ({
		authenticatedPage,
		page,
		supabaseAdmin,
		testUser,
	}) => {
		const authPage = authenticatedPage
		const workspaceName = `Public Test ${Date.now()}`

		// Create workspace
		await authPage.click('[data-testid="create-workspace-button"]')
		await authPage.fill('[data-testid="workspace-name-input"]', workspaceName)
		await authPage.click('[data-testid="confirm-create-workspace"]')

		// Wait for workspace to be created
		await expect(authPage.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		// Get workspace ID
		await authPage.waitForURL(/\/workspace\/[a-f0-9-]+/)
		const workspaceId = authPage.url().split('/workspace/')[1]

		// Create a public document
		const { data: document, error } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: 'Public Document',
				created_by: testUser.id,
				sharing_mode: 'public_read_only',
			})
			.select()
			.single()

		expect(error).toBeNull()
		expect(document).toBeTruthy()

		// Navigate to the document as a guest (new page context)
		await page.goto(`/d/${document.id}`)

		// Check that limited metadata is displayed
		await expect(page.getByText(/Last updated/)).toBeVisible()

		// Verify that full metadata is NOT shown
		await expect(page.getByText('Created by:')).not.toBeVisible()
		await expect(page.getByText('Created:')).not.toBeVisible()

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('updates metadata when document is modified', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Update Test ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')

		// Wait for workspace to be created
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		// Get workspace ID
		await page.waitForURL(/\/workspace\/[a-f0-9-]+/)
		const workspaceId = page.url().split('/workspace/')[1]

		// Create a document with a specific past timestamp
		const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
		const { data: document, error } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: 'Old Document',
				created_by: testUser.id,
				sharing_mode: 'private',
				created_at: pastDate.toISOString(),
				updated_at: pastDate.toISOString(),
			})
			.select()
			.single()

		expect(error).toBeNull()
		expect(document).toBeTruthy()

		// Navigate to the document
		await page.goto(`/d/${document.id}`)

		// Check that it shows "1 day ago"
		await expect(page.getByText(/1 day ago|a day ago/)).toBeVisible()

		// Update the document via API
		const { error: updateError } = await supabaseAdmin
			.from('documents')
			.update({ name: 'Updated Document' })
			.eq('id', document.id)

		expect(updateError).toBeNull()

		// Refresh the page
		await page.reload()

		// Now it should show both old created date and new updated date
		await expect(page.getByText(/1 day ago|a day ago/)).toBeVisible() // Created date
		await expect(page.getByText(/just now|seconds? ago/)).toBeVisible() // Updated date

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('shows archived status in metadata', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Archive Test ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')

		// Wait for workspace to be created
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		// Get workspace ID
		await page.waitForURL(/\/workspace\/[a-f0-9-]+/)
		const workspaceId = page.url().split('/workspace/')[1]

		// Create an archived document
		const { data: document, error } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: 'Archived Document',
				created_by: testUser.id,
				sharing_mode: 'private',
				is_archived: true,
				archived_at: new Date().toISOString(),
			})
			.select()
			.single()

		expect(error).toBeNull()
		expect(document).toBeTruthy()

		// Navigate to the document
		await page.goto(`/d/${document.id}`)

		// Check that archived status is shown
		await expect(page.getByText(/Archived/)).toBeVisible()

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})
})
