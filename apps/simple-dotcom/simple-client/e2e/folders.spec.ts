import { expect, test } from './fixtures/test-fixtures'

test.describe('Folder Operations', () => {
	test('should create, rename, move and delete folders', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage

		// Get workspace ID from dashboard
		const workspacesResponse = await page.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces.data[0].id

		// Test 1: Create root folder
		const createRootResponse = await page.request.post(`/api/workspaces/${workspaceId}/folders`, {
			data: { name: 'Root Folder' },
		})
		expect(createRootResponse.ok()).toBeTruthy()
		const rootFolder = await createRootResponse.json()
		expect(rootFolder.data.name).toBe('Root Folder')
		expect(rootFolder.data.parent_folder_id).toBeNull()

		// Test 2: Create nested folder
		const createChildResponse = await page.request.post(`/api/workspaces/${workspaceId}/folders`, {
			data: {
				name: 'Child Folder',
				parent_folder_id: rootFolder.data.id,
			},
		})
		expect(createChildResponse.ok()).toBeTruthy()
		const childFolder = await createChildResponse.json()
		expect(childFolder.data.parent_folder_id).toBe(rootFolder.data.id)

		// Test 3: Rename folder
		const renameResponse = await page.request.patch(
			`/api/workspaces/${workspaceId}/folders/${childFolder.data.id}`,
			{
				data: { name: 'Renamed Child' },
			}
		)
		expect(renameResponse.ok()).toBeTruthy()
		const renamedFolder = await renameResponse.json()
		expect(renamedFolder.data.name).toBe('Renamed Child')

		// Test 4: Move folder to root
		const moveResponse = await page.request.patch(
			`/api/workspaces/${workspaceId}/folders/${childFolder.data.id}`,
			{
				data: { parent_folder_id: null },
			}
		)
		expect(moveResponse.ok()).toBeTruthy()
		const movedFolder = await moveResponse.json()
		expect(movedFolder.data.parent_folder_id).toBeNull()

		// Test 5: Delete folder
		const deleteResponse = await page.request.delete(
			`/api/workspaces/${workspaceId}/folders/${childFolder.data.id}`
		)
		expect(deleteResponse.ok()).toBeTruthy()

		// Verify folder is deleted
		const getDeletedResponse = await page.request.get(
			`/api/workspaces/${workspaceId}/folders/${childFolder.data.id}`
		)
		expect(getDeletedResponse.status()).toBe(404)
	})

	test('should prevent folder depth exceeding 10 levels', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage

		// Get workspace ID
		const workspacesResponse = await page.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces.data[0].id

		// Create chain of 10 folders (max depth)
		let parentId = null
		const folderIds = []

		for (let i = 1; i <= 10; i++) {
			const response = await page.request.post(`/api/workspaces/${workspaceId}/folders`, {
				data: {
					name: `Level ${i}`,
					parent_folder_id: parentId,
				},
			})
			expect(response.ok()).toBeTruthy()
			const folder = await response.json()
			folderIds.push(folder.data.id)
			parentId = folder.data.id
		}

		// Try to create 11th level - should fail
		const failResponse = await page.request.post(`/api/workspaces/${workspaceId}/folders`, {
			data: {
				name: 'Level 11',
				parent_folder_id: parentId,
			},
		})
		expect(failResponse.ok()).toBeFalsy()
		expect(failResponse.status()).toBe(400)

		const error = await failResponse.json()
		expect(error.error.code).toBe('FOLDER_DEPTH_EXCEEDED')
	})

	test('should prevent circular folder references', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage

		// Get workspace ID
		const workspacesResponse = await page.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces.data[0].id

		// Create parent and child folders
		const parentResponse = await page.request.post(`/api/workspaces/${workspaceId}/folders`, {
			data: { name: 'Parent' },
		})
		const parent = await parentResponse.json()

		const childResponse = await page.request.post(`/api/workspaces/${workspaceId}/folders`, {
			data: {
				name: 'Child',
				parent_folder_id: parent.data.id,
			},
		})
		const child = await childResponse.json()

		// Try to move parent into child - should fail
		const moveResponse = await page.request.patch(
			`/api/workspaces/${workspaceId}/folders/${parent.data.id}`,
			{
				data: { parent_folder_id: child.data.id },
			}
		)
		expect(moveResponse.ok()).toBeFalsy()
		expect(moveResponse.status()).toBe(400)

		const error = await moveResponse.json()
		expect(error.error.code).toBe('FOLDER_CYCLE_DETECTED')

		// Try to move folder into itself - should fail
		const selfMoveResponse = await page.request.patch(
			`/api/workspaces/${workspaceId}/folders/${parent.data.id}`,
			{
				data: { parent_folder_id: parent.data.id },
			}
		)
		expect(selfMoveResponse.ok()).toBeFalsy()
		expect(selfMoveResponse.status()).toBe(400)

		const selfError = await selfMoveResponse.json()
		expect(selfError.error.code).toBe('FOLDER_CYCLE_DETECTED')
	})

	test('should list all folders in workspace', async ({
		authenticatedPage,
		supabaseAdmin,
		testUser,
	}) => {
		const page = authenticatedPage

		// Get workspace ID
		const workspacesResponse = await page.request.get('/api/workspaces')
		const workspaces = await workspacesResponse.json()
		const workspaceId = workspaces.data[0].id

		// Create multiple folders
		const folderNames = ['Documents', 'Images', 'Videos', 'Archive']
		const createdFolders = []

		for (const name of folderNames) {
			const response = await page.request.post(`/api/workspaces/${workspaceId}/folders`, {
				data: { name },
			})
			const folder = await response.json()
			createdFolders.push(folder.data)
		}

		// List all folders
		const listResponse = await page.request.get(`/api/workspaces/${workspaceId}/folders`)
		expect(listResponse.ok()).toBeTruthy()
		const folders = await listResponse.json()

		// Verify all folders are returned (sorted alphabetically)
		expect(folders.data.length).toBe(4)
		const sortedNames = folderNames.sort()
		folders.data.forEach((folder: any, index: number) => {
			expect(folder.name).toBe(sortedNames[index])
		})
	})
})
