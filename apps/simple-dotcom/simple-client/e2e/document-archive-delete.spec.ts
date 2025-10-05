import { expect, test } from './fixtures/test-fixtures'

test.describe('Document Archive and Hard Delete', () => {
	test('workspace member can archive document via archive endpoint', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Archive Test ${Date.now()}`
		const documentName = 'Test Document'

		// Create workspace
		await page.goto('/dashboard')
		await page.getByRole('button', { name: 'Create Workspace' }).click()
		await page.getByPlaceholder('Enter workspace name').fill(workspaceName)
		await page.getByRole('button', { name: 'Create' }).click()
		await expect(page.getByText(workspaceName)).toBeVisible()

		// Navigate to workspace
		await page.getByText(workspaceName).click()
		const workspaceUrl = page.url()
		const workspaceId = workspaceUrl.split('/workspace/')[1]

		// Create document
		await page.getByRole('button', { name: 'Create Document' }).click()
		await page.getByPlaceholder('Enter document name').fill(documentName)
		await page.getByRole('button', { name: 'Create', exact: true }).click()
		await expect(page.getByText(documentName)).toBeVisible()

		// Get document ID
		const { data: documents } = await supabaseAdmin
			.from('documents')
			.select('id')
			.eq('workspace_id', workspaceId)
			.eq('name', documentName)
			.single()

		const documentId = documents!.id

		// Archive document using new archive endpoint
		const archiveResponse = await page.request.post(`/api/documents/${documentId}/archive`)
		expect(archiveResponse.ok()).toBeTruthy()
		const archiveResult = await archiveResponse.json()
		expect(archiveResult.data.message).toBe('Document archived successfully')

		// Verify document is archived in database
		const { data: doc } = await supabaseAdmin
			.from('documents')
			.select('is_archived')
			.eq('id', documentId)
			.single()

		expect(doc!.is_archived).toBe(true)

		// Verify audit log was created
		const { data: auditLog } = await supabaseAdmin
			.from('audit_logs')
			.select('*')
			.eq('document_id', documentId)
			.eq('action', 'document_archived')
			.single()

		expect(auditLog).toBeTruthy()
		expect(auditLog.user_id).toBe(testUser.id)
	})

	test('only workspace owner can hard delete document', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Delete Test ${Date.now()}`
		const documentName = 'Document to Delete'

		// Create workspace (user becomes owner)
		await page.goto('/dashboard')
		await page.getByRole('button', { name: 'Create Workspace' }).click()
		await page.getByPlaceholder('Enter workspace name').fill(workspaceName)
		await page.getByRole('button', { name: 'Create' }).click()
		await expect(page.getByText(workspaceName)).toBeVisible()

		// Navigate to workspace
		await page.getByText(workspaceName).click()
		const workspaceUrl = page.url()
		const workspaceId = workspaceUrl.split('/workspace/')[1]

		// Create document
		await page.getByRole('button', { name: 'Create Document' }).click()
		await page.getByPlaceholder('Enter document name').fill(documentName)
		await page.getByRole('button', { name: 'Create', exact: true }).click()
		await expect(page.getByText(documentName)).toBeVisible()

		// Get document ID
		const { data: documents } = await supabaseAdmin
			.from('documents')
			.select('id')
			.eq('workspace_id', workspaceId)
			.eq('name', documentName)
			.single()

		const documentId = documents!.id

		// Owner can hard delete with confirmation header
		const deleteResponse = await page.request.delete(`/api/documents/${documentId}/delete`, {
			headers: {
				'X-Confirm-Delete': 'true',
			},
		})
		expect(deleteResponse.ok()).toBeTruthy()
		const deleteResult = await deleteResponse.json()
		expect(deleteResult.data.message).toBe('Document permanently deleted')

		// Verify document is gone from database
		const { data: deletedDoc } = await supabaseAdmin
			.from('documents')
			.select('id')
			.eq('id', documentId)
			.maybeSingle()

		expect(deletedDoc).toBeNull()

		// Verify audit log was created
		const { data: auditLog } = await supabaseAdmin
			.from('audit_logs')
			.select('*')
			.eq('document_id', documentId)
			.eq('action', 'document_hard_deleted')
			.single()

		expect(auditLog).toBeTruthy()
		expect(auditLog.user_id).toBe(testUser.id)
	})

	test('hard delete requires confirmation header', async ({ authenticatedPage, supabaseAdmin }) => {
		const page = authenticatedPage
		const workspaceName = `Header Test ${Date.now()}`
		const documentName = 'Header Test Document'

		// Create workspace
		await page.goto('/dashboard')
		await page.getByRole('button', { name: 'Create Workspace' }).click()
		await page.getByPlaceholder('Enter workspace name').fill(workspaceName)
		await page.getByRole('button', { name: 'Create' }).click()
		await expect(page.getByText(workspaceName)).toBeVisible()

		// Navigate to workspace
		await page.getByText(workspaceName).click()
		const workspaceUrl = page.url()
		const workspaceId = workspaceUrl.split('/workspace/')[1]

		// Create document
		await page.getByRole('button', { name: 'Create Document' }).click()
		await page.getByPlaceholder('Enter document name').fill(documentName)
		await page.getByRole('button', { name: 'Create', exact: true }).click()
		await expect(page.getByText(documentName)).toBeVisible()

		// Get document ID
		const { data: documents } = await supabaseAdmin
			.from('documents')
			.select('id')
			.eq('workspace_id', workspaceId)
			.eq('name', documentName)
			.single()

		const documentId = documents!.id

		// Try to hard delete without confirmation header - should fail
		const deleteResponse = await page.request.delete(`/api/documents/${documentId}/delete`)
		expect(deleteResponse.status()).toBe(400)
		const result = await deleteResponse.json()
		expect(result.error.message).toContain('Confirmation header X-Confirm-Delete: true is required')

		// Verify document still exists
		const { data: doc } = await supabaseAdmin
			.from('documents')
			.select('id')
			.eq('id', documentId)
			.single()

		expect(doc).toBeTruthy()
	})

	test('cannot archive already archived document', async ({ authenticatedPage, supabaseAdmin }) => {
		const page = authenticatedPage
		const workspaceName = `Double Archive Test ${Date.now()}`
		const documentName = 'Archive Once Document'

		// Create workspace
		await page.goto('/dashboard')
		await page.getByRole('button', { name: 'Create Workspace' }).click()
		await page.getByPlaceholder('Enter workspace name').fill(workspaceName)
		await page.getByRole('button', { name: 'Create' }).click()
		await expect(page.getByText(workspaceName)).toBeVisible()

		// Navigate to workspace
		await page.getByText(workspaceName).click()
		const workspaceUrl = page.url()
		const workspaceId = workspaceUrl.split('/workspace/')[1]

		// Create document
		await page.getByRole('button', { name: 'Create Document' }).click()
		await page.getByPlaceholder('Enter document name').fill(documentName)
		await page.getByRole('button', { name: 'Create', exact: true }).click()
		await expect(page.getByText(documentName)).toBeVisible()

		// Get document ID
		const { data: documents } = await supabaseAdmin
			.from('documents')
			.select('id')
			.eq('workspace_id', workspaceId)
			.eq('name', documentName)
			.single()

		const documentId = documents!.id

		// First archive - should succeed
		const firstArchive = await page.request.post(`/api/documents/${documentId}/archive`)
		expect(firstArchive.ok()).toBeTruthy()

		// Second archive - should fail
		const secondArchive = await page.request.post(`/api/documents/${documentId}/archive`)
		expect(secondArchive.status()).toBe(409)
		const result = await secondArchive.json()
		expect(result.error.message).toBe('Document is already archived')
	})

	test('member cannot hard delete in workspace where they are not owner', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Member Delete Test ${Date.now()}`
		const documentName = 'Owner Only Delete'

		// Create workspace as owner
		await page.goto('/dashboard')
		await page.getByRole('button', { name: 'Create Workspace' }).click()
		await page.getByPlaceholder('Enter workspace name').fill(workspaceName)
		await page.getByRole('button', { name: 'Create' }).click()
		await expect(page.getByText(workspaceName)).toBeVisible()

		// Navigate to workspace
		await page.getByText(workspaceName).click()
		const workspaceUrl = page.url()
		const workspaceId = workspaceUrl.split('/workspace/')[1]

		// Create document
		await page.getByRole('button', { name: 'Create Document' }).click()
		await page.getByPlaceholder('Enter document name').fill(documentName)
		await page.getByRole('button', { name: 'Create', exact: true }).click()
		await expect(page.getByText(documentName)).toBeVisible()

		// Get document ID
		const { data: documents } = await supabaseAdmin
			.from('documents')
			.select('id')
			.eq('workspace_id', workspaceId)
			.eq('name', documentName)
			.single()

		const documentId = documents!.id

		// Create another test user to be a member
		const memberEmail = `member_${Date.now()}@example.com`
		const { data: memberUser } = await supabaseAdmin.auth.admin.createUser({
			email: memberEmail,
			password: 'Password123!',
			email_confirm: true,
		})

		// Add member to workspace
		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: workspaceId,
			user_id: memberUser.user!.id,
			role: 'member',
		})

		// Change current user's role to member (simulate member trying to delete)
		await supabaseAdmin
			.from('workspace_members')
			.update({ role: 'member' })
			.eq('workspace_id', workspaceId)
			.eq('user_id', testUser.id)

		// Member tries to hard delete - should fail
		const deleteResponse = await page.request.delete(`/api/documents/${documentId}/delete`, {
			headers: {
				'X-Confirm-Delete': 'true',
			},
		})
		expect(deleteResponse.status()).toBe(403)
		const result = await deleteResponse.json()
		expect(result.error.message).toBe('Only workspace owners can permanently delete documents')

		// Verify document still exists
		const { data: doc } = await supabaseAdmin
			.from('documents')
			.select('id')
			.eq('id', documentId)
			.single()

		expect(doc).toBeTruthy()
	})
})
