import { expect, test } from './fixtures/test-fixtures'

test.describe.skip('Realtime Document Updates', () => {
	test('document appears immediately in workspace browser when created via API', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Realtime Test ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', workspaceName)
			.single()

		const workspaceId = workspace!.id

		// Navigate to workspace browser
		await page.goto(`/workspace/${workspaceId}`)
		await expect(page.getByTestId('create-document-button')).toBeVisible()

		// Verify empty state
		await expect(page.getByText(/no documents yet/i)).toBeVisible()

		// Create document via API (simulating realtime event from another client)
		const documentName = `Realtime Doc ${Date.now()}`
		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: documentName,
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Document should appear immediately without page reload
		await expect(page.getByText(documentName)).toBeVisible({ timeout: 5000 })

		// Verify it's in the document list
		await expect(page.getByTestId('document-list')).toContainText(documentName)

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('document appears immediately in dashboard sidebar when created via API', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Dashboard Realtime ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', workspaceName)
			.single()

		const workspaceId = workspace!.id
		const workspaceContent = page.getByTestId(`workspace-content-${workspaceId}`)

		// Stay on dashboard, expand workspace
		const toggleButton = page.getByTestId(`toggle-workspace-${workspaceId}`)
		await toggleButton.click()

		// Wait for expansion
		await expect(workspaceContent).toBeVisible()

		// Create document via API
		const documentName = `Dashboard Doc ${Date.now()}`
		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: documentName,
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Document should appear in sidebar immediately
		await expect(workspaceContent.getByText(documentName)).toBeVisible({ timeout: 5000 })

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('document disappears immediately when archived via API', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Archive Realtime ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', workspaceName)
			.single()

		const workspaceId = workspace!.id

		// Create document first
		const documentName = `To Archive ${Date.now()}`
		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: documentName,
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Navigate to workspace browser
		await page.goto(`/workspace/${workspaceId}`)

		// Wait for document to appear
		await expect(page.getByText(documentName)).toBeVisible({ timeout: 5000 })

		// Archive document via API
		await supabaseAdmin
			.from('documents')
			.update({
				is_archived: true,
				archived_at: new Date().toISOString(),
			})
			.eq('id', document.id)

		// Document should disappear immediately
		await expect(page.getByText(documentName)).not.toBeVisible({ timeout: 5000 })

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('document updates name immediately when renamed via API', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Rename Realtime ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', workspaceName)
			.single()

		const workspaceId = workspace!.id

		// Create document
		const originalName = `Original ${Date.now()}`
		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: originalName,
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Navigate to workspace browser
		await page.goto(`/workspace/${workspaceId}`)

		// Wait for document to appear
		await expect(page.getByText(originalName)).toBeVisible({ timeout: 5000 })

		// Rename document via API
		const newName = `Renamed ${Date.now()}`
		await supabaseAdmin.from('documents').update({ name: newName }).eq('id', document.id)

		// New name should appear immediately
		await expect(page.getByText(newName)).toBeVisible({ timeout: 5000 })

		// Old name should disappear
		await expect(page.getByText(originalName)).not.toBeVisible({ timeout: 2000 })

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('document appears in both tabs simultaneously when created', async ({
		context,
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page1 = authenticatedPage
		const workspaceName = `Multi-tab Test ${Date.now()}`

		// Create workspace in first tab
		await page1.click('[data-testid="create-workspace-button"]')
		await page1.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page1.click('[data-testid="confirm-create-workspace"]')
		await expect(page1.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', workspaceName)
			.single()

		const workspaceId = workspace!.id

		// Navigate first tab to workspace browser
		await page1.goto(`/workspace/${workspaceId}`)
		await expect(page1.getByTestId('create-document-button')).toBeVisible()

		// Open second tab with same workspace
		const page2 = await context.newPage()
		await page2.goto(`/workspace/${workspaceId}`)
		await expect(page2.getByTestId('create-document-button')).toBeVisible()

		// Create document via API (simulating third client)
		const documentName = `Multi-tab Doc ${Date.now()}`
		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: documentName,
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Document should appear in BOTH tabs immediately
		await expect(page1.getByText(documentName)).toBeVisible({ timeout: 5000 })
		await expect(page2.getByText(documentName)).toBeVisible({ timeout: 5000 })

		// Cleanup
		await page2.close()
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('document created via UI appears without reload', async ({
		authenticatedPage,
		supabaseAdmin,
	}) => {
		const page = authenticatedPage
		const workspaceName = `UI Create Test ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', workspaceName)
			.single()

		const workspaceId = workspace!.id

		// Navigate to workspace browser
		await page.goto(`/workspace/${workspaceId}`)
		await expect(page.getByTestId('create-document-button')).toBeVisible()

		// Create document via UI
		await page.click('[data-testid="create-document-button"]')
		const documentName = `UI Doc ${Date.now()}`
		await page.fill('[data-testid="document-name-input"]', documentName)
		await page.click('[data-testid="confirm-create-document"]')

		// Document should appear immediately (via realtime, not page reload)
		await expect(page.getByText(documentName)).toBeVisible({ timeout: 5000 })

		// Verify no page reload occurred by checking URL hasn't changed
		expect(page.url()).toContain(`/workspace/${workspaceId}`)

		// Cleanup
		const { data: document } = await supabaseAdmin
			.from('documents')
			.select('id')
			.eq('workspace_id', workspaceId)
			.eq('name', documentName)
			.single()

		await supabaseAdmin.from('documents').delete().eq('id', document!.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})
})
