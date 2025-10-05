import { expect, test } from './fixtures/test-fixtures'

test.describe('Document Metadata Display', () => {
	test('displays metadata for workspace members', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
		testData,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Metadata Test ${Date.now()}`

		// Create workspace and document via testData helper
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: workspaceName,
		})
		const document = await testData.createDocument({
			workspaceId: workspace.id,
			createdBy: testUser.id,
			name: 'Test Document',
		})

		// Navigate to the document
		await page.goto(`/d/${document.id}`)

		// Check that metadata is displayed
		await expect(page.getByText(/Created:/)).toBeVisible()
		await expect(page.getByText(/Last updated:/)).toBeVisible()

		// Verify time display (should be "less than a minute ago" or similar)
		await expect(
			page.getByText(/less than a minute ago|just now|seconds? ago/).first()
		).toBeVisible()

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
	})

	test('displays limited metadata for guests with public documents', async ({
		authenticatedPage,
		page,
		supabaseAdmin,
		testUser,
		testData,
	}) => {
		const authPage = authenticatedPage
		const workspaceName = `Public Test ${Date.now()}`

		// Create workspace and public document via testData helper
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: workspaceName,
		})
		const document = await testData.createDocument({
			workspaceId: workspace.id,
			createdBy: testUser.id,
			name: 'Public Document',
			sharingMode: 'public_read_only',
		})

		// Navigate to the document as a guest (new page context)
		await page.goto(`/d/${document.id}`)

		// Check that limited metadata is displayed
		await expect(page.getByText(/Last updated/)).toBeVisible()

		// Verify that full metadata is NOT shown
		await expect(page.getByText('Created by:')).not.toBeVisible()
		await expect(page.getByText('Created:')).not.toBeVisible()

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
	})

	test('updates metadata when document is modified', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
		testData,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Update Test ${Date.now()}`

		// Create workspace via testData helper
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: workspaceName,
		})

		// Create a document with a specific past timestamp
		const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
		const { data: document, error } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspace.id,
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
		await expect(page.getByText(/1 day ago|a day ago/).first()).toBeVisible()

		// Update the document via API
		const { error: updateError } = await supabaseAdmin
			.from('documents')
			.update({ name: 'Updated Document' })
			.eq('id', document.id)

		expect(updateError).toBeNull()

		// Refresh the page
		await page.reload()

		// Now it should show both old created date and new updated date
		await expect(page.getByText(/1 day ago|a day ago/).first()).toBeVisible() // Created date
		await expect(
			page.getByText(/less than a minute ago|just now|seconds? ago/).first()
		).toBeVisible() // Updated date

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
	})

	test('shows archived status in metadata', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
		testData,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Archive Test ${Date.now()}`

		// Create workspace via testData helper
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: workspaceName,
		})

		// Create an archived document
		const { data: document, error } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspace.id,
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

		// Check that archived status is shown (look for the badge, not the title)
		await expect(page.locator('span.bg-orange-100').getByText(/Archived/)).toBeVisible()

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
	})
})
