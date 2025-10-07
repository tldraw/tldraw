import { expect, test } from './fixtures/test-fixtures'

test.describe('Document Move Operations', () => {
	test('can move document to different folder within same workspace', async ({
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
		await page.waitForSelector('[data-testid="workspace-name-input"]', {
			state: 'hidden',
			timeout: 10000,
		})
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		// Get workspace ID
		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', workspaceName)
			.single()

		const workspaceId = workspace!.id

		// Create a folder
		const { data: folder } = await supabaseAdmin
			.from('folders')
			.insert({
				workspace_id: workspaceId,
				name: 'Test Folder',
				created_by: testUser.id,
			})
			.select()
			.single()

		// Create a document at workspace root
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

		// Move document to folder via API
		const moveResponse = await page.request.post(`/api/documents/${document.id}/move`, {
			data: {
				target_folder_id: folder.id,
			},
		})

		expect(moveResponse.ok()).toBeTruthy()
		const moveData = await moveResponse.json()
		expect(moveData.success).toBe(true)
		expect(moveData.data.folder_id).toBe(folder.id)
		expect(moveData.data.workspace_id).toBe(workspaceId)

		// Verify in database
		const { data: movedDoc } = await supabaseAdmin
			.from('documents')
			.select('folder_id, workspace_id')
			.eq('id', document.id)
			.single()

		expect(movedDoc).toBeTruthy()
		expect(movedDoc!.folder_id).toBe(folder.id)
		expect(movedDoc!.workspace_id).toBe(workspaceId)

		// Verify audit log was created
		const { data: auditLog } = await supabaseAdmin
			.from('audit_logs')
			.select('*')
			.eq('document_id', document.id)
			.eq('action', 'document.moved_folder')
			.single()

		expect(auditLog).toBeTruthy()
		expect(auditLog!.user_id).toBe(testUser.id)
		expect(auditLog!.workspace_id).toBe(workspaceId)
	})

	test('can move document to workspace root from folder', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Root Move ${Date.now()}`

		// Create workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })
		await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10000 })

		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', workspaceName)
			.single()

		const workspaceId = workspace!.id

		// Create a folder
		const { data: folder } = await supabaseAdmin
			.from('folders')
			.insert({
				workspace_id: workspaceId,
				name: 'Test Folder',
				created_by: testUser.id,
			})
			.select()
			.single()

		// Create a document in the folder
		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				name: 'Folder Document',
				created_by: testUser.id,
				sharing_mode: 'private',
				folder_id: folder.id,
			})
			.select()
			.single()

		// Move document to workspace root
		const moveResponse = await page.request.post(`/api/documents/${document.id}/move`, {
			data: {
				target_folder_id: null,
			},
		})

		expect(moveResponse.ok()).toBeTruthy()
		const moveData = await moveResponse.json()
		expect(moveData.success).toBe(true)
		expect(moveData.data.folder_id).toBeNull()

		// Verify in database
		const { data: movedDoc } = await supabaseAdmin
			.from('documents')
			.select('folder_id')
			.eq('id', document.id)
			.single()

		expect(movedDoc!.folder_id).toBeNull()
	})

	test('document creator can move document between workspaces', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage

		// Create two workspaces
		const workspace1Name = `Workspace 1 ${Date.now()}`
		const workspace2Name = `Workspace 2 ${Date.now()}`

		// Create first workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspace1Name)
		await page.click('[data-testid="confirm-create-workspace"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

		// Create second workspace
		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspace2Name)
		await page.click('[data-testid="confirm-create-workspace"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

		// Get workspace IDs
		const { data: workspace1 } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', workspace1Name)
			.single()

		const { data: workspace2 } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', workspace2Name)
			.single()

		// Create document in workspace 1
		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspace1!.id,
				name: 'Cross Workspace Doc',
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Move document to workspace 2 (creator can do this)
		const moveResponse = await page.request.post(`/api/documents/${document.id}/move`, {
			data: {
				target_workspace_id: workspace2!.id,
				target_folder_id: null,
			},
		})

		expect(moveResponse.ok()).toBeTruthy()
		const moveData = await moveResponse.json()
		expect(moveData.success).toBe(true)
		expect(moveData.data.workspace_id).toBe(workspace2!.id)

		// Verify in database
		const { data: movedDoc } = await supabaseAdmin
			.from('documents')
			.select('workspace_id')
			.eq('id', document.id)
			.single()

		expect(movedDoc!.workspace_id).toBe(workspace2!.id)

		// Verify correct audit log action
		const { data: auditLog } = await supabaseAdmin
			.from('audit_logs')
			.select('*')
			.eq('document_id', document.id)
			.eq('action', 'document.moved_workspace')
			.single()

		expect(auditLog).toBeTruthy()
		expect(auditLog!.workspace_id).toBe(workspace2!.id)
		expect(auditLog!.metadata).toBeTruthy()
	})

	test('non-creator member cannot move document between workspaces', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
		testData,
	}) => {
		const page = authenticatedPage

		// Create two workspaces as user 1
		const workspace1 = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `WS1 ${Date.now()}`,
		})

		const workspace2 = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `WS2 ${Date.now()}`,
		})

		// Create a second user (member, not creator)
		const memberEmail = `member-${Date.now()}@example.com`
		const { data: memberAuth, error: memberError } = await supabaseAdmin.auth.admin.createUser({
			email: memberEmail,
			password: 'TestPassword123!',
			email_confirm: true,
			user_metadata: {
				display_name: 'Member User',
				name: 'Member User',
			},
		})

		if (memberError || !memberAuth?.user?.id) {
			throw new Error(`Failed to create member user: ${memberError?.message}`)
		}

		const memberId = memberAuth.user.id

		// Add user 2 as member to both workspaces
		await testData.addWorkspaceMember(workspace1.id, memberId)
		await testData.addWorkspaceMember(workspace2.id, memberId)

		// Create document in workspace 1 as user 1 (owner)
		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspace1.id,
				name: 'Owner Doc',
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Simulate member trying to move across workspaces by directly creating request
		// We can't authenticate as second user in this test, so we just verify the API
		// permission check by creating document with different creator
		const { data: memberDoc } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspace1.id,
				name: 'Member Doc',
				created_by: memberId,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Try to move owner's document - should fail because testUser is not the creator
		// Create a document where testUser is NOT the creator
		const { data: otherUserDoc } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspace1.id,
				name: 'Other User Doc',
				created_by: memberId, // Created by member, not testUser
				sharing_mode: 'private',
			})
			.select()
			.single()

		// TestUser tries to move a document they didn't create to another workspace
		const moveResponse = await page.request.post(`/api/documents/${otherUserDoc.id}/move`, {
			data: {
				target_workspace_id: workspace2.id,
			},
		})

		expect(moveResponse.status()).toBe(403)
		const errorData = await moveResponse.json()
		expect(errorData.success).toBe(false)
		expect(errorData.error?.message).toContain('Only the document creator')

		// Verify document wasn't moved
		const { data: unmoved } = await supabaseAdmin
			.from('documents')
			.select('workspace_id')
			.eq('id', otherUserDoc.id)
			.single()

		expect(unmoved!.workspace_id).toBe(workspace1.id)

		// Cleanup
		await supabaseAdmin.auth.admin.deleteUser(memberId)
	})

	test('cannot move document to non-existent folder', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Invalid Folder ${Date.now()}`

		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', workspaceName)
			.single()

		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspace!.id,
				name: 'Test Doc',
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Try to move to fake folder ID
		const fakeId = '00000000-0000-0000-0000-000000000000'
		const moveResponse = await page.request.post(`/api/documents/${document.id}/move`, {
			data: {
				target_folder_id: fakeId,
			},
		})

		expect(moveResponse.status()).toBe(404)
		const errorData = await moveResponse.json()
		expect(errorData.success).toBe(false)
		expect(errorData.error?.message).toContain('Target folder not found')
	})

	test('cannot move document to folder in different workspace', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage

		// Create two workspaces
		const ws1Name = `WS1 Folder ${Date.now()}`
		const ws2Name = `WS2 Folder ${Date.now()}`

		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', ws1Name)
		await page.click('[data-testid="confirm-create-workspace"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', ws2Name)
		await page.click('[data-testid="confirm-create-workspace"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

		const { data: ws1 } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', ws1Name)
			.single()

		const { data: ws2 } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', ws2Name)
			.single()

		// Create folder in workspace 2
		const { data: folder } = await supabaseAdmin
			.from('folders')
			.insert({
				workspace_id: ws2!.id,
				name: 'WS2 Folder',
				created_by: testUser.id,
			})
			.select()
			.single()

		// Create document in workspace 1
		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: ws1!.id,
				name: 'WS1 Doc',
				created_by: testUser.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// Try to move document to folder in different workspace without changing workspace
		const moveResponse = await page.request.post(`/api/documents/${document.id}/move`, {
			data: {
				target_folder_id: folder.id,
			},
		})

		expect(moveResponse.status()).toBe(409)
		const errorData = await moveResponse.json()
		expect(errorData.success).toBe(false)
		expect(errorData.error?.message).toContain('does not belong to')
	})

	test('cannot move document to same location', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Same Location ${Date.now()}`

		await page.click('[data-testid="create-workspace-button"]')
		await page.fill('[data-testid="workspace-name-input"]', workspaceName)
		await page.click('[data-testid="confirm-create-workspace"]')
		await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'hidden' })

		const { data: workspace } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('name', workspaceName)
			.single()

		const { data: folder } = await supabaseAdmin
			.from('folders')
			.insert({
				workspace_id: workspace!.id,
				name: 'Test Folder',
				created_by: testUser.id,
			})
			.select()
			.single()

		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspace!.id,
				name: 'Test Doc',
				created_by: testUser.id,
				sharing_mode: 'private',
				folder_id: folder.id,
			})
			.select()
			.single()

		// Try to move to the same location
		const moveResponse = await page.request.post(`/api/documents/${document.id}/move`, {
			data: {
				target_folder_id: folder.id,
			},
		})

		expect(moveResponse.status()).toBe(400)
		const errorData = await moveResponse.json()
		expect(errorData.success).toBe(false)
		expect(errorData.error?.message).toContain('already in the specified location')
	})

	test('must be workspace member to move document', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
		testData,
	}) => {
		const page = authenticatedPage

		// Create workspace as user 1
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `Member Only ${Date.now()}`,
		})

		// Create a second user who is NOT a member
		const nonMemberEmail = `nonmember-${Date.now()}@example.com`
		const { data: nonMemberAuth } = await supabaseAdmin.auth.admin.createUser({
			email: nonMemberEmail,
			password: 'TestPassword123!',
			email_confirm: true,
			user_metadata: {
				display_name: 'Non Member',
				name: 'Non Member',
			},
		})

		const nonMemberId = nonMemberAuth!.user!.id

		// Create document in workspace with nonMember as creator
		// This simulates a scenario where document was shared/created by non-member
		const { data: document } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: workspace.id,
				name: 'Private Doc',
				created_by: nonMemberId,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// TestUser tries to move document but is checked if they're a member
		// Since nonMemberId is the creator and NOT a member, the API should reject
		// Create a second workspace for nonMember
		const { data: nonMemberWorkspace } = await supabaseAdmin
			.from('workspaces')
			.insert({
				name: `Non Member WS ${Date.now()}`,
				owner_id: nonMemberId,
				is_private: false,
			})
			.select()
			.single()

		// Try to move document - testUser is a member of their workspace but trying
		// to move a document they can access. The check should verify membership.
		// Actually, let's test that testUser cannot access document from workspace
		// they're not a member of.

		// Create a completely separate workspace owned by nonMember
		const { data: separateWs } = await supabaseAdmin
			.from('workspaces')
			.insert({
				name: `Separate WS ${Date.now()}`,
				owner_id: nonMemberId,
				is_private: false,
			})
			.select()
			.single()

		// Add nonMember as owner to their workspace
		await supabaseAdmin.from('workspace_members').insert({
			workspace_id: separateWs!.id,
			user_id: nonMemberId,
			workspace_role: 'owner',
		})

		// Create document in separate workspace
		const { data: separateDoc } = await supabaseAdmin
			.from('documents')
			.insert({
				workspace_id: separateWs!.id,
				name: 'Separate Doc',
				created_by: nonMemberId,
				sharing_mode: 'private',
			})
			.select()
			.single()

		// TestUser tries to move a document from workspace they're not a member of
		const moveResponse = await page.request.post(`/api/documents/${separateDoc.id}/move`, {
			data: {
				target_folder_id: null,
			},
		})

		expect(moveResponse.status()).toBe(403)
		const errorData = await moveResponse.json()
		expect(errorData.success).toBe(false)
		expect(errorData.error?.message).toContain('must be a member')

		// Cleanup
		await supabaseAdmin.auth.admin.deleteUser(nonMemberId)
	})
})
