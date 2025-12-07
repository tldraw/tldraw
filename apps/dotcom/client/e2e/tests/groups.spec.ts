import { getRandomName, openNewTab } from '../fixtures/helpers'
import { expect, test } from '../fixtures/tla-test'

test.describe('groups', () => {
	test.beforeEach(async ({ database, editor }) => {
		await database.migrateUser()
		await database.enableGroupsFrontend()
		await editor.isLoaded()
		await editor.ensureSidebarOpen()
	})

	test.describe('basic operations', () => {
		test('create group', async ({ page, sidebar, editor }) => {
			const groupName = getRandomName()

			await sidebar.createGroup(groupName)
			await sidebar.expectGroupVisible(groupName)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expectGroupVisible(groupName)
		})

		test('rename group', async ({ page, sidebar, editor }) => {
			const groupName = getRandomName()
			const newGroupName = getRandomName()

			await sidebar.createGroup(groupName)
			await sidebar.expectGroupVisible(groupName)

			await sidebar.renameGroup(groupName, newGroupName)

			await sidebar.expectGroupVisible(newGroupName)
			await sidebar.expectGroupNotVisible(groupName)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expectGroupVisible(newGroupName)
			await sidebar.expectGroupNotVisible(groupName)
		})

		test('delete group', async ({ page, sidebar, editor }) => {
			const groupName = getRandomName()
			const fileName = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(homeFileName)
			await sidebar.expectFileVisible(homeFileName)

			await sidebar.createGroup(groupName)
			await sidebar.expectGroupVisible(groupName)
			await sidebar.createFileInGroup(groupName, fileName)
			await sidebar.expectFileVisible(fileName)

			await sidebar.getFileByName(homeFileName).click()
			await editor.isLoaded()

			await sidebar.deleteGroup(groupName)

			await sidebar.expectGroupNotVisible(groupName)
			await sidebar.expectFileNotVisible(fileName)
			await sidebar.expectFileVisible(homeFileName)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expectGroupNotVisible(groupName)
			await sidebar.expectFileNotVisible(fileName)
			await sidebar.expectFileVisible(homeFileName)
		})

		test('expand and collapse', async ({ page, sidebar, editor }) => {
			const group1 = getRandomName()
			const group2 = getRandomName()
			const homeFileName = getRandomName()
			const file1 = getRandomName()
			const file2 = getRandomName()

			await sidebar.createNewDocument(homeFileName)
			await sidebar.expectFileVisible(homeFileName)

			await sidebar.createGroup(group1)
			await sidebar.createGroup(group2)
			await sidebar.expectGroupExpanded(group1)
			await sidebar.expectGroupExpanded(group2)

			await sidebar.createFileInGroup(group1, file1)
			await sidebar.createFileInGroup(group2, file2)

			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(file2)
			await sidebar.expectFileVisible(homeFileName)

			await sidebar.toggleGroup(group1)
			await sidebar.expectGroupCollapsed(group1)
			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileVisible(file2)
			await sidebar.expectFileVisible(homeFileName)

			await sidebar.toggleGroup(group2)
			await sidebar.expectGroupCollapsed(group2)
			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileNotVisible(file2)
			await sidebar.expectFileVisible(homeFileName)

			await sidebar.toggleGroup(group1)
			await sidebar.expectGroupExpanded(group1)
			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileNotVisible(file2)
			await sidebar.expectFileVisible(homeFileName)

			await sidebar.toggleGroup(group2)
			await sidebar.expectGroupExpanded(group2)
			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(file2)
			await sidebar.expectFileVisible(homeFileName)

			await sidebar.getFileByName(homeFileName).click()
			await editor.isLoaded()

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expectGroupCollapsed(group1)
			await sidebar.expectGroupCollapsed(group2)

			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileNotVisible(file2)
			await sidebar.expectFileVisible(homeFileName)
		})

		test('create file via empty state', async ({ page, sidebar, editor }) => {
			const groupName = getRandomName()
			const fileName = getRandomName()

			await sidebar.createGroup(groupName)
			await sidebar.expectGroupExpanded(groupName)

			const group = sidebar.getGroup(groupName)
			await expect(group).toContainText('Drag files here')
			await expect(group).toContainText('create a file')
			await expect(group).toContainText('copy invite link')

			const createFileButton = group.getByRole('button', { name: 'create a file' })
			await createFileButton.click()

			const input = page.getByTestId('tla-sidebar-rename-input')
			await expect(input).toBeVisible({ timeout: 10000 })
			await expect(input).toBeFocused()
			await input.fill(fileName)
			await page.keyboard.press('Enter')

			await sidebar.mutationResolution()

			await sidebar.expectFileVisible(fileName)
			const filesInGroup = await sidebar.getFilesInGroup(groupName)
			expect(filesInGroup).toContain(fileName)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expandGroup(groupName)

			await sidebar.expectFileVisible(fileName)
		})
	})

	test.describe('group operations', () => {
		test('drag groups to reorder', async ({ page, sidebar, editor }) => {
			const group1 = getRandomName()
			const group2 = getRandomName()
			const group3 = getRandomName()

			await sidebar.createGroup(group1)
			await sidebar.createGroup(group2)
			await sidebar.createGroup(group3)

			// Get initial order (newest first)
			const initialOrder = await sidebar.getGroupOrder()
			expect(initialOrder).toEqual([group3, group2, group1])

			// Drag group3 (first) to position after group1 (last)
			await sidebar.dragGroupToPosition(group3, group1)

			// Verify new order - group3 should have moved
			const newOrder = await sidebar.getGroupOrder()
			expect(newOrder).not.toEqual(initialOrder)
			expect(newOrder).toContain(group1)
			expect(newOrder).toContain(group2)
			expect(newOrder).toContain(group3)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()

			// Verify order persisted
			const orderAfterReload = await sidebar.getGroupOrder()
			expect(orderAfterReload).toEqual(newOrder)
		})
	})

	test.describe('file operations', () => {
		test('drag file between groups', async ({ page, sidebar, editor }) => {
			const group1 = getRandomName()
			const group2 = getRandomName()
			const file1 = getRandomName()

			await sidebar.createGroup(group1)
			await sidebar.createGroup(group2)
			await sidebar.expectGroupExpanded(group1)
			await sidebar.expectGroupExpanded(group2)

			await sidebar.createFileInGroup(group1, file1)
			await sidebar.expectFileVisible(file1)

			const filesInGroup1Before = await sidebar.getFilesInGroup(group1)
			expect(filesInGroup1Before).toContain(file1)

			// Drag file from group1 to group2
			await sidebar.dragFileToGroup(file1, group2)

			const filesInGroup1After = await sidebar.getFilesInGroup(group1)
			const filesInGroup2 = await sidebar.getFilesInGroup(group2)
			expect(filesInGroup1After).not.toContain(file1)
			expect(filesInGroup2).toContain(file1)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expandGroup(group1)
			await sidebar.expandGroup(group2)

			const filesInGroup1AfterReload = await sidebar.getFilesInGroup(group1)
			const filesInGroup2AfterReload = await sidebar.getFilesInGroup(group2)
			expect(filesInGroup1AfterReload).not.toContain(file1)
			expect(filesInGroup2AfterReload).toContain(file1)
		})

		test('pin and unpin files', async ({ page, sidebar, editor }) => {
			const groupName = getRandomName()
			const homeFileName = getRandomName()
			const file1 = getRandomName()
			const file2 = getRandomName()
			const file3 = getRandomName()

			await sidebar.createNewDocument(homeFileName)
			await sidebar.expectFileVisible(homeFileName)

			await sidebar.createGroup(groupName)
			await sidebar.expectGroupExpanded(groupName)
			await sidebar.createFileInGroup(groupName, file1)
			await sidebar.createFileInGroup(groupName, file2)
			await sidebar.createFileInGroup(groupName, file3)

			await sidebar.getFileByName(homeFileName).click()
			await editor.isLoaded()
			await sidebar.expectFileNotPinned(file1)
			await sidebar.expectFileNotPinned(file2)
			await sidebar.expectFileNotPinned(file3)

			await sidebar.pinFileInGroup(file2)
			await sidebar.expectFilePinned(file2)

			let fileOrder = await sidebar.getFilesInGroup(groupName)
			expect(fileOrder[0]).toBe(file2)

			await sidebar.pinFileInGroup(file1)
			await sidebar.expectFilePinned(file1)

			fileOrder = await sidebar.getFilesInGroup(groupName)
			const file1Index = fileOrder.indexOf(file1)
			const file2Index = fileOrder.indexOf(file2)
			const file3Index = fileOrder.indexOf(file3)

			expect(file1Index).toBeLessThan(file3Index)
			expect(file2Index).toBeLessThan(file3Index)

			await sidebar.unpinFileInGroup(file2)
			await sidebar.expectFileNotPinned(file2)
			await sidebar.expectFilePinned(file1)

			await sidebar.getFileByName(homeFileName).click()
			await editor.isLoaded()

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expandGroup(groupName)

			await sidebar.expectFilePinned(file1)
			await sidebar.expectFileNotPinned(file2)
			await sidebar.expectFileNotPinned(file3)

			fileOrder = await sidebar.getFilesInGroup(groupName)
			expect(fileOrder[0]).toBe(file1)
		})

		test('delete file', async ({ page, sidebar, editor, deleteFileDialog }) => {
			const groupName = getRandomName()
			const file1 = getRandomName()
			const file2 = getRandomName()

			await sidebar.createGroup(groupName)
			await sidebar.expectGroupExpanded(groupName)
			await sidebar.createFileInGroup(groupName, file1)
			await sidebar.createFileInGroup(groupName, file2)

			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(file2)

			await sidebar.deleteFileInGroup(file1)
			await deleteFileDialog.expectIsVisible()
			await deleteFileDialog.confirmDeletion()
			await deleteFileDialog.expectIsNotVisible()
			await sidebar.mutationResolution()

			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileVisible(file2)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expandGroup(groupName)

			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileVisible(file2)
		})

		test('duplicate file', async ({ page, sidebar, editor }) => {
			const groupName = getRandomName()
			const file1 = getRandomName()
			const file1Copy = getRandomName()

			await sidebar.createGroup(groupName)
			await sidebar.expectGroupExpanded(groupName)
			await sidebar.createFileInGroup(groupName, file1)

			await sidebar.expectFileVisible(file1)

			await sidebar.duplicateFileInGroup(file1, file1Copy)
			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(file1Copy)

			const filesInGroup = await sidebar.getFilesInGroup(groupName)
			expect(filesInGroup).toContain(file1)
			expect(filesInGroup).toContain(file1Copy)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expandGroup(groupName)

			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(file1Copy)
		})

		test('move file between groups', async ({ page, sidebar, editor }) => {
			const group1 = getRandomName()
			const group2 = getRandomName()
			const file1 = getRandomName()

			await sidebar.createGroup(group1)
			await sidebar.createGroup(group2)
			await sidebar.expectGroupExpanded(group1)
			await sidebar.expectGroupExpanded(group2)

			await sidebar.createFileInGroup(group1, file1)
			await sidebar.expectFileVisible(file1)

			const filesInGroup1Before = await sidebar.getFilesInGroup(group1)
			expect(filesInGroup1Before).toContain(file1)

			await sidebar.moveFileToGroup(file1, group2)

			const filesInGroup1After = await sidebar.getFilesInGroup(group1)
			const filesInGroup2 = await sidebar.getFilesInGroup(group2)
			expect(filesInGroup1After).not.toContain(file1)
			expect(filesInGroup2).toContain(file1)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expandGroup(group1)
			await sidebar.expandGroup(group2)

			const filesInGroup1AfterReload = await sidebar.getFilesInGroup(group1)
			const filesInGroup2AfterReload = await sidebar.getFilesInGroup(group2)
			expect(filesInGroup1AfterReload).not.toContain(file1)
			expect(filesInGroup2AfterReload).toContain(file1)
		})

		test('move file to home', async ({ page, sidebar, editor }) => {
			const groupName = getRandomName()
			const file1 = getRandomName()
			const homeFile = getRandomName()

			await sidebar.createNewDocument(homeFile)
			await sidebar.expectFileVisible(homeFile)

			await sidebar.createGroup(groupName)
			await sidebar.expectGroupExpanded(groupName)
			await sidebar.createFileInGroup(groupName, file1)

			const filesInGroupBefore = await sidebar.getFilesInGroup(groupName)
			expect(filesInGroupBefore).toContain(file1)

			await sidebar.moveFileToHome(file1)

			const filesInGroupAfter = await sidebar.getFilesInGroup(groupName)
			expect(filesInGroupAfter).not.toContain(file1)
			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(homeFile)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expandGroup(groupName)

			const filesInGroupAfterReload = await sidebar.getFilesInGroup(groupName)
			expect(filesInGroupAfterReload).not.toContain(file1)
			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(homeFile)
		})
	})

	test.describe('sharing', () => {
		test.beforeEach(async ({ context }) => {
			await context.grantPermissions(['clipboard-read', 'clipboard-write'])
		})

		test('invite user to group', async ({ sidebar, browser, database }) => {
			const groupName = getRandomName()
			const fileName = getRandomName()

			await sidebar.createGroup(groupName)
			await sidebar.expectGroupExpanded(groupName)
			await sidebar.createFileInGroup(groupName, fileName)

			const inviteUrl = await sidebar.copyGroupInviteLinkFromMenu(groupName)

			// Migrate invitee to groups backend but not frontend (tests auto-enable)
			await database.migrateUser(true)

			const parallelIndex = test.info().parallelIndex
			const { newSidebar, newEditor, newGroupInviteDialog, newContext } = await openNewTab(
				browser,
				{
					url: inviteUrl,
					allowClipboard: true,
					userProps: { user: 'suppy', index: parallelIndex },
				}
			)

			await newEditor.isLoaded()
			await newEditor.ensureSidebarOpen()
			await newGroupInviteDialog.acceptInvitation()

			// Verify group visible (proves frontend flag was auto-enabled)
			await newSidebar.expectGroupVisible(groupName)
			await newSidebar.expandGroup(groupName)
			await newSidebar.expectFileVisible(fileName)

			await newContext.close()
		})

		test('delete file removes for all group members', async ({
			sidebar,
			browser,
			database,
			deleteFileDialog,
		}) => {
			const groupName = getRandomName()
			const fileName = getRandomName()

			await sidebar.createGroup(groupName)
			await sidebar.expectGroupExpanded(groupName)
			await sidebar.createFileInGroup(groupName, fileName)

			const inviteUrl = await sidebar.copyGroupInviteLinkFromMenu(groupName)
			await database.migrateUser(true)

			const parallelIndex = test.info().parallelIndex
			const { newSidebar, newEditor, newGroupInviteDialog, newContext } = await openNewTab(
				browser,
				{
					url: inviteUrl,
					allowClipboard: true,
					userProps: { user: 'suppy', index: parallelIndex },
				}
			)

			await newEditor.isLoaded()
			await newEditor.ensureSidebarOpen()
			await newGroupInviteDialog.acceptInvitation()

			await newSidebar.expectGroupVisible(groupName)
			await newSidebar.expandGroup(groupName)
			await newSidebar.expectFileVisible(fileName)

			// Delete file from original user
			await sidebar.deleteFileInGroup(fileName)
			await deleteFileDialog.expectIsVisible()
			await deleteFileDialog.confirmDeletion()
			await deleteFileDialog.expectIsNotVisible()
			await sidebar.mutationResolution()

			await sidebar.expectFileNotVisible(fileName)

			// Verify file also removed for other user
			await newSidebar.expectFileNotVisible(fileName)

			await newContext.close()
		})

		test('delete group removes for all members', async ({ sidebar, browser, database }) => {
			const groupName = getRandomName()
			const fileName = getRandomName()

			await sidebar.createGroup(groupName)
			await sidebar.expectGroupExpanded(groupName)
			await sidebar.createFileInGroup(groupName, fileName)

			const inviteUrl = await sidebar.copyGroupInviteLinkFromMenu(groupName)
			await database.migrateUser(true)

			const parallelIndex = test.info().parallelIndex
			const { newSidebar, newEditor, newGroupInviteDialog, newContext } = await openNewTab(
				browser,
				{
					url: inviteUrl,
					allowClipboard: true,
					userProps: { user: 'suppy', index: parallelIndex },
				}
			)

			await newEditor.isLoaded()
			await newEditor.ensureSidebarOpen()
			await newGroupInviteDialog.acceptInvitation()

			await newSidebar.expectGroupVisible(groupName)

			// Delete group from original user
			await sidebar.deleteGroup(groupName)
			await sidebar.expectGroupNotVisible(groupName)

			// Verify group also removed for other user
			await newSidebar.expectGroupNotVisible(groupName)

			await newContext.close()
		})
	})
})
