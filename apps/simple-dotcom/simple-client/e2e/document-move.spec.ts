import { expect, test } from './fixtures/test-fixtures'

test.describe('Document Move', () => {
	test('can move document via API and verify database state', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Move Test ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')

		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		// Get workspace ID
		const workspaceElement = page
			.locator(`[data-testid^="workspace-item-"]`)
			.filter({ hasText: workspaceName })
			.first()
		const workspaceId = (await workspaceElement.getAttribute('data-testid'))?.replace(
			'workspace-item-',
			''
		)

		// Create folder
		const { data: folder } = await supabaseAdmin
			.from('folders')
			.insert({
				workspace_id: workspaceId,
				name: 'Test Folder',
				created_by: testUser.id,
			})
			.select()
			.single()

		// Create document at root
		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: 'Test Document',
				created_by: testUser.id,
				sharing_mode: 'private',
				folder_id: null,
			})
			.select()
			.single()

		expect(document.folder_id).toBeNull()

		// Move document to folder via API
		const moveResponse = await page.evaluate(
			async ({ docId, folderId }) => {
				const response = await fetch(`/api/documents/${docId}/move`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ folder_id: folderId }),
				})
				return { ok: response.ok, status: response.status }
			},
			{ docId: document.id, folderId: folder.id }
		)

		expect(moveResponse.ok).toBe(true)

		// Verify document moved in database
		const { data: movedDoc } = await supabaseAdmin
			.from('documents')
			.select('folder_id')
			.eq('id', document.id)
			.single()

		expect(movedDoc?.folder_id).toBe(folder.id)

		// Move back to workspace root
		const moveToRootResponse = await page.evaluate(
			async ({ docId }) => {
				const response = await fetch(`/api/documents/${docId}/move`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ folder_id: null }),
				})
				return { ok: response.ok, status: response.status }
			},
			{ docId: document.id }
		)

		expect(moveToRootResponse.ok).toBe(true)

		// Verify document back at root
		const { data: docAtRoot } = await supabaseAdmin
			.from('documents')
			.select('folder_id')
			.eq('id', document.id)
			.single()

		expect(docAtRoot?.folder_id).toBeNull()

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('folders').delete().eq('id', folder.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('prevents moving archived documents', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Archived Move Test ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')

		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		// Get workspace ID
		const workspaceElement = page
			.locator(`[data-testid^="workspace-item-"]`)
			.filter({ hasText: workspaceName })
			.first()
		const workspaceId = (await workspaceElement.getAttribute('data-testid'))?.replace(
			'workspace-item-',
			''
		)

		// Create folder
		const { data: folder } = await supabaseAdmin
			.from('folders')
			.insert({
				workspace_id: workspaceId,
				name: 'Test Folder',
				created_by: testUser.id,
			})
			.select()
			.single()

		// Create archived document
		const { data: document } = await supabaseAdmin
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

		// Try to move archived document (should fail)
		const moveResponse = await page.evaluate(
			async ({ docId, folderId }) => {
				const response = await fetch(`/api/documents/${docId}/move`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ folder_id: folderId }),
				})
				const data = response.ok ? await response.json() : null
				return { ok: response.ok, status: response.status, data }
			},
			{ docId: document.id, folderId: folder.id }
		)

		// Should fail with 409 Conflict
		expect(moveResponse.ok).toBe(false)
		expect(moveResponse.status).toBe(409)

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('folders').delete().eq('id', folder.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('validates folder belongs to same workspace', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage

		// Create first workspace
		const workspace1Name = `Workspace 1 ${Date.now()}`
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspace1Name)
		await page.click('[data-testid="confirm-create-workspace"]')
		await expect(page.getByText(workspace1Name)).toBeVisible({ timeout: 10000 })

		const workspace1Element = page
			.locator(`[data-testid^="workspace-item-"]`)
			.filter({ hasText: workspace1Name })
			.first()
		const workspace1Id = (await workspace1Element.getAttribute('data-testid'))?.replace(
			'workspace-item-',
			''
		)

		// Create second workspace
		const workspace2Name = `Workspace 2 ${Date.now()}`
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspace2Name)
		await page.click('[data-testid="confirm-create-workspace"]')
		await expect(page.getByText(workspace2Name)).toBeVisible({ timeout: 10000 })

		const workspace2Element = page
			.locator(`[data-testid^="workspace-item-"]`)
			.filter({ hasText: workspace2Name })
			.first()
		const workspace2Id = (await workspace2Element.getAttribute('data-testid'))?.replace(
			'workspace-item-',
			''
		)

		// Create folder in workspace 1
		const { data: folder1 } = await supabaseAdmin
			.from('folders')
			.insert({
				workspace_id: workspace1Id,
				name: 'Folder in Workspace 1',
				created_by: testUser.id,
			})
			.select()
			.single()

		// Create document in workspace 2
		const { data: doc2 } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspace2Id,
				name: 'Doc in Workspace 2',
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Try to move document from workspace 2 to folder in workspace 1 (should fail)
		const moveResponse = await page.evaluate(
			async ({ docId, folderId }) => {
				const response = await fetch(`/api/documents/${docId}/move`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ folder_id: folderId }),
				})
				return { ok: response.ok, status: response.status }
			},
			{ docId: doc2.id, folderId: folder1.id }
		)

		// Should fail with 409 Conflict
		expect(moveResponse.ok).toBe(false)
		expect(moveResponse.status).toBe(409)

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', doc2.id)
		await supabaseAdmin.from('folders').delete().eq('id', folder1.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspace1Id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspace2Id)
	})
})
