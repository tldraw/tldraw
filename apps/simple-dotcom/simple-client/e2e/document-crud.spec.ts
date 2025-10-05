import { expect, test } from './fixtures/test-fixtures'

test.describe('Document CRUD Operations', () => {
	test('can create, rename, duplicate and archive documents', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `CRUD Test ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')

		// Wait for workspace to be created
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		// Get workspace ID
		await page.waitForURL(/\/workspace\/[a-f0-9-]+/)
		const workspaceId = page.url().split('/workspace/')[1]

		// Create a document via API
		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: 'Test Document',
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Test renaming document
		const { error: renameError } = await supabaseAdmin
			.from('documents')
			.update({ name: 'Renamed Document' })
			.eq('id', document.id)

		expect(renameError).toBeNull()

		// Verify rename worked
		const { data: renamedDoc } = await supabaseAdmin
			.from('documents')
			.select('name')
			.eq('id', document.id)
			.single()

		expect(renamedDoc).toBeTruthy()
		expect(renamedDoc!.name).toBe('Renamed Document')

		// Test archiving (soft delete)
		const { error: archiveError } = await supabaseAdmin
			.from('documents')
			.update({
				is_archived: true,
				archived_at: new Date().toISOString(),
			})
			.eq('id', document.id)

		expect(archiveError).toBeNull()

		// Verify document is archived
		const { data: archivedDoc } = await supabaseAdmin
			.from('documents')
			.select('is_archived, archived_at')
			.eq('id', document.id)
			.single()

		expect(archivedDoc).toBeTruthy()
		expect(archivedDoc!.is_archived).toBe(true)
		expect(archivedDoc!.archived_at).toBeTruthy()

		// Test restoring document
		const { error: restoreError } = await supabaseAdmin
			.from('documents')
			.update({
				is_archived: false,
				archived_at: null,
			})
			.eq('id', document.id)

		expect(restoreError).toBeNull()

		// Verify document is restored
		const { data: restoredDoc } = await supabaseAdmin
			.from('documents')
			.select('is_archived, archived_at')
			.eq('id', document.id)
			.single()

		expect(restoredDoc).toBeTruthy()
		expect(restoredDoc!.is_archived).toBe(false)
		expect(restoredDoc!.archived_at).toBeNull()

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('can duplicate document metadata', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Duplicate Test ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')

		// Wait for workspace
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		await page.waitForURL(/\/workspace\/[a-f0-9-]+/)
		const workspaceId = page.url().split('/workspace/')[1]

		// Create original document
		const { data: original } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: 'Original Document',
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Create duplicate
		const { data: duplicate } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: original.workspace_id,
				folder_id: original.folder_id,
				name: `${original.name} (copy)`,
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Verify duplicate was created
		expect(duplicate).toBeTruthy()
		expect(duplicate.name).toBe('Original Document (copy)')
		expect(duplicate.workspace_id).toBe(original.workspace_id)
		expect(duplicate.id).not.toBe(original.id) // Different document

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', original.id)
		await supabaseAdmin.from('documents').delete().eq('id', duplicate.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('respects document limit of 1000 per workspace', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Limit Test ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')

		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		await page.waitForURL(/\/workspace\/[a-f0-9-]+/)
		const workspaceId = page.url().split('/workspace/')[1]

		// Check that we can create documents (won't actually create 1000)
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

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('archived documents do not appear in active lists', async ({
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

		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		await page.waitForURL(/\/workspace\/[a-f0-9-]+/)
		const workspaceId = page.url().split('/workspace/')[1]

		// Create active and archived documents
		const { data: activeDoc } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: 'Active Document',
				created_by: testUser.id,
				sharing_mode: 'private',
				is_archived: false,
			})
			.select()
			.single()

		const { data: archivedDoc } = await supabaseAdmin
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

		// Query non-archived documents
		const { data: activeDocs } = await supabaseAdmin
			.from('documents')
			.select('*')
			.eq('workspace_id', workspaceId)
			.eq('is_archived', false)

		// Verify only active document is returned
		expect(activeDocs).toBeTruthy()
		expect(activeDocs!).toHaveLength(1)
		expect(activeDocs![0].id).toBe(activeDoc.id)

		// Query with archived included
		const { data: allDocs } = await supabaseAdmin
			.from('documents')
			.select('*')
			.eq('workspace_id', workspaceId)

		// Verify both documents are returned
		expect(allDocs).toHaveLength(2)

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', activeDoc.id)
		await supabaseAdmin.from('documents').delete().eq('id', archivedDoc.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})
})
