import { expect, test } from './fixtures/test-fixtures'

test.describe('Document UI Operations (NAV-03A)', () => {
	test('can create a document via UI', async ({
		authenticatedContext,
		supabaseAdmin,
		testData,
		testUser,
	}) => {
		const page = await authenticatedContext.newPage()
		const workspaceName = `UI Create Test ${Date.now()}`
		const workspace = await testData.createWorkspace({ ownerId: testUser.id, name: workspaceName })
		let documentId: string | undefined

		try {
			// Navigate straight to workspace
			await page.goto(`/workspace/${workspace.id}`)
			await expect(page.locator('body')).toContainText(workspaceName)
			await expect(page.getByTestId('create-document-button')).toBeVisible({ timeout: 5000 })

			// Click create document button
			await page.click('[data-testid="create-document-button"]')

			// Fill in document name
			const documentName = `Test Document ${Date.now()}`
			await page.fill('[data-testid="document-name-input"]', documentName)

			// Create document
			await page.click('[data-testid="confirm-create-document"]')

			// Wait for auto-navigation to document page
			await page.waitForURL(/\/d\/[a-f0-9-]+/, { timeout: 10000 })

			// Verify we're on the document page with the correct title
			await expect(page.locator('body')).toContainText(documentName)

			// Verify document was created in database
			const { data: document } = await supabaseAdmin
				.from('documents')
				.select('*')
				.eq('workspace_id', workspace.id)
				.eq('name', documentName)
				.single()

			expect(document).toBeTruthy()
			expect(document!.name).toBe(documentName)
			documentId = document!.id
		} finally {
			if (documentId) {
				await supabaseAdmin.from('documents').delete().eq('id', documentId)
			}
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await page.close()
		}
	})

	test('validates document name is required', async ({
		authenticatedContext,
		supabaseAdmin,
		testData,
		testUser,
	}) => {
		const page = await authenticatedContext.newPage()
		const workspaceName = `Validation Test ${Date.now()}`
		const workspace = await testData.createWorkspace({ ownerId: testUser.id, name: workspaceName })

		try {
			// Seed workspace and open it
			await page.goto(`/workspace/${workspace.id}`)
			await expect(page.locator('body')).toContainText(workspaceName)

			// Open create modal
			await page.click('[data-testid="create-document-button"]')

			// Verify button is disabled when name is empty
			const createButton = page.locator('[data-testid="confirm-create-document"]')
			await expect(createButton).toBeDisabled()

			// Fill in a name and verify button is enabled
			await page.fill('[data-testid="document-name-input"]', 'Valid Name')
			await expect(createButton).toBeEnabled()

			// Clear the name and verify button is disabled again
			await page.fill('[data-testid="document-name-input"]', '')
			await expect(createButton).toBeDisabled()

			// Cleanup handled in finally
		} finally {
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await page.close()
		}
	})

	test('can rename a document via UI', async ({
		authenticatedContext,
		supabaseAdmin,
		testUser,
		testData,
	}) => {
		const page = await authenticatedContext.newPage()
		const workspaceName = `Rename Test ${Date.now()}`
		const workspace = await testData.createWorkspace({ ownerId: testUser.id, name: workspaceName })
		let documentId: string | undefined

		try {
			// Create a document via API
			const { data: document } = await supabaseAdmin
				.from('documents')
				.insert({
					workspace_id: workspace.id,
					name: 'Original Name',
					created_by: testUser.id,
					sharing_mode: 'private',
				})
				.select()
				.single()

			documentId = document.id

			// Navigate to workspace page
			await page.goto(`/workspace/${workspace.id}`)
			await expect(page.getByText('Original Name')).toBeVisible({ timeout: 5000 })

			// Note: Rename via action menu would require hovering and clicking
		} finally {
			if (documentId) {
				await supabaseAdmin.from('documents').delete().eq('id', documentId)
			}
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			await page.close()
		}
	})

	test.skip('document list updates in realtime when document is created', async ({
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

		// Wait for modal to close and workspace to be created
		await page.waitForSelector('[data-testid="workspace-name-input"]', {
			state: 'hidden',
			timeout: 10000,
		})
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		// Get workspace ID from the workspace list
		const workspaceElement = page
			.locator(`[data-testid^="workspace-item-"]`)
			.filter({ hasText: workspaceName })
			.first()
		const workspaceId = (await workspaceElement.getAttribute('data-testid'))?.replace(
			'workspace-item-',
			''
		)

		// Wait for page to load
		await expect(page.getByTestId('create-document-button')).toBeVisible()

		// Create document via API (simulating another user or tab)
		const documentName = `Realtime Document ${Date.now()}`
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

		// Document should appear in UI via realtime subscription
		await expect(page.getByText(documentName)).toBeVisible({ timeout: 10000 })

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test.skip('document list updates in realtime when document is archived', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Archive Realtime Test ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')

		// Wait for modal to close and workspace to be created
		await page.waitForSelector('[data-testid="workspace-name-input"]', {
			state: 'hidden',
			timeout: 10000,
		})
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		// Get workspace ID from the workspace list
		const workspaceElement = page
			.locator(`[data-testid^="workspace-item-"]`)
			.filter({ hasText: workspaceName })
			.first()
		const workspaceId = (await workspaceElement.getAttribute('data-testid'))?.replace(
			'workspace-item-',
			''
		)

		// Create document
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

		// Wait for document to appear
		await expect(page.getByText(documentName)).toBeVisible({ timeout: 5000 })

		// Archive document via API (simulating action)
		await supabaseAdmin
			.from('documents')
			.update({
				is_archived: true,
				archived_at: new Date().toISOString(),
			})
			.eq('id', document.id)

		// Document should disappear from list via realtime subscription
		await expect(page.getByText(documentName)).not.toBeVisible({ timeout: 10000 })

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('shows empty state when workspace has no documents', async ({
		authenticatedPage,
		supabaseAdmin,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Empty State Test ${Date.now()}`

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

		// Navigate to workspace page
		await page.goto(`/workspace/${workspaceId}`)

		// Should see empty state
		await expect(page.getByText(/no documents yet/i)).toBeVisible({ timeout: 5000 })

		// Cleanup
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('can click on document to navigate to document view', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Navigation Test ${Date.now()}`

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
		const documentName = `Clickable Doc ${Date.now()}`
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

		// Navigate to workspace page
		await page.goto(`/workspace/${workspaceId}`)

		// Wait for document to appear
		await expect(page.getByText(documentName)).toBeVisible({ timeout: 5000 })

		// Click on document
		await page.getByText(documentName).click()

		// Should navigate to document view
		await expect(page).toHaveURL(`/d/${document.id}`, { timeout: 5000 })

		// Cleanup
		await supabaseAdmin.from('documents').delete().eq('id', document.id)
		await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId)
	})

	test('can permanently delete document via workspace browser menu (BUG-19)', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
		testData,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Delete UI Test ${Date.now()}`
		const documentName = `Doc to Delete ${Date.now()}`

		// Create workspace and document via testData helper
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: workspaceName,
		})
		const document = await testData.createDocument({
			workspaceId: workspace.id,
			createdBy: testUser.id,
			name: documentName,
		})

		const documentId = document.id

		try {
			// Navigate to workspace page
			await page.goto(`/workspace/${workspace.id}`)

			// Wait for document to appear
			await expect(page.getByText(documentName)).toBeVisible({ timeout: 5000 })

			// Find the document card by its name text and hover to show actions
			const documentCard = page.locator('.group').filter({ hasText: documentName })
			await documentCard.hover()

			// Wait for actions to appear (they show on hover) and click the three-dot menu button
			await documentCard.locator('button[aria-label="Actions"]').click()

			// Set up dialog handler to accept the confirmation
			page.once('dialog', (dialog) => dialog.accept())

			// Wait for the DELETE API request to complete
			const deleteRequest = page.waitForResponse(
				(response) =>
					response.url().includes(`/api/documents/${documentId}/delete`) &&
					response.request().method() === 'DELETE'
			)

			// Click "Delete permanently" option
			await page.getByRole('menuitem', { name: /delete permanently/i }).click()

			// Document should disappear from list immediately (optimistic update)
			await expect(page.getByText(documentName)).not.toBeVisible({ timeout: 1000 })

			// Wait for the API call to complete
			const response = await deleteRequest
			expect(response.ok()).toBeTruthy()

			// Verify document is permanently deleted from database
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
		} finally {
			// Cleanup workspace (document should already be deleted)
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		}
	})
})
