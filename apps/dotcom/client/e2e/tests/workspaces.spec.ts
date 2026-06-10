import { getRandomName, openNewTab } from '../fixtures/helpers'
import { expect, test } from '../fixtures/tla-test'

// The sidebar shows a fixed list of workspaces ("My files" + the user's
// workspaces) at the top, and the active workspace's files below. Whether
// clicking a workspace should also open its most recent file is still an open
// product question, so these tests only assert on the contents of the file
// list — not on which file/URL ends up open after a workspace click.
// TODO(workspace-click): once decided, add coverage for the click behaviour
// itself and for clicking an empty workspace.
test.describe('workspaces', () => {
	test.beforeEach(async ({ database, editor }) => {
		await database.migrateUser()
		await database.enableGroupsFrontend()
		await editor.isLoaded()
		await editor.ensureSidebarOpen()
	})

	test.describe('basic operations', () => {
		test('create workspace', async ({ page, sidebar, editor }) => {
			const workspaceName = getRandomName()

			await sidebar.expectWorkspaceVisible('My files')
			await sidebar.createWorkspace(workspaceName)
			await sidebar.expectWorkspaceVisible(workspaceName)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expectWorkspaceVisible(workspaceName)
		})

		test('rename workspace', async ({ page, sidebar, editor }) => {
			const workspaceName = getRandomName()
			const newWorkspaceName = getRandomName()

			await sidebar.createWorkspace(workspaceName)
			await sidebar.expectWorkspaceVisible(workspaceName)

			await sidebar.renameWorkspace(workspaceName, newWorkspaceName)

			await sidebar.expectWorkspaceVisible(newWorkspaceName)
			await sidebar.expectWorkspaceNotVisible(workspaceName)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expectWorkspaceVisible(newWorkspaceName)
			await sidebar.expectWorkspaceNotVisible(workspaceName)
		})

		test('delete workspace', async ({ page, sidebar, editor }) => {
			const workspaceName = getRandomName()
			const fileName = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(fileName)
			await sidebar.createNewDocument(homeFileName)

			await sidebar.createWorkspace(workspaceName)
			await sidebar.moveFileToWorkspace(fileName, workspaceName)
			await sidebar.expectFileNotVisible(fileName)

			await sidebar.deleteWorkspace(workspaceName)

			await sidebar.expectWorkspaceNotVisible(workspaceName)
			await sidebar.expectFileNotVisible(fileName)
			await sidebar.expectFileVisible(homeFileName)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expectWorkspaceNotVisible(workspaceName)
			await sidebar.expectFileNotVisible(fileName)
			await sidebar.expectFileVisible(homeFileName)
		})

		test('switching workspaces shows their files', async ({ sidebar }) => {
			const workspaceName = getRandomName()
			const fileName = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(fileName)
			await sidebar.createNewDocument(homeFileName)

			await sidebar.createWorkspace(workspaceName)
			await sidebar.moveFileToWorkspace(fileName, workspaceName)

			await sidebar.expectActiveWorkspace('My files')
			await sidebar.expectFileVisible(homeFileName)
			await sidebar.expectFileNotVisible(fileName)

			await sidebar.switchToWorkspace(workspaceName)
			await sidebar.expectFileVisible(fileName)
			await sidebar.expectFileNotVisible(homeFileName)

			await sidebar.switchToWorkspace('My files')
			await sidebar.expectFileVisible(homeFileName)
			await sidebar.expectFileNotVisible(fileName)
		})

		test('create file button creates in the active workspace', async ({ sidebar }) => {
			const workspaceName = getRandomName()
			const file1 = getRandomName()
			const file2 = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createNewDocument(homeFileName)

			await sidebar.createWorkspace(workspaceName)
			await sidebar.moveFileToWorkspace(file1, workspaceName)

			await sidebar.switchToWorkspace(workspaceName)
			await sidebar.createNewDocument(file2)

			await sidebar.expectActiveWorkspace(workspaceName)
			const filesInWorkspace = await sidebar.getVisibleFiles()
			expect(filesInWorkspace).toContain(file1)
			expect(filesInWorkspace).toContain(file2)

			await sidebar.switchToWorkspace('My files')
			await sidebar.expectFileNotVisible(file2)
			await sidebar.expectFileVisible(homeFileName)
		})
	})

	test.describe('file operations', () => {
		test('move file between workspaces via the menu', async ({ page, sidebar, editor }) => {
			const workspace1 = getRandomName()
			const workspace2 = getRandomName()
			const file1 = getRandomName()
			const file2 = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createNewDocument(file2)
			await sidebar.createNewDocument(homeFileName)

			await sidebar.createWorkspace(workspace1)
			await sidebar.createWorkspace(workspace2)
			await sidebar.moveFileToWorkspace(file1, workspace1)
			await sidebar.moveFileToWorkspace(file2, workspace1)

			await sidebar.switchToWorkspace(workspace1)
			// make sure the file we move is not the active one
			await sidebar.getFileByName(file2).click()
			await sidebar.expectFileActive(file2)

			await sidebar.moveFileToWorkspace(file1, workspace2)
			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileVisible(file2)

			await sidebar.switchToWorkspace(workspace2)
			await sidebar.expectFileVisible(file1)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()

			await sidebar.switchToWorkspace(workspace2)
			await sidebar.expectFileVisible(file1)
			await sidebar.switchToWorkspace(workspace1)
			await sidebar.expectFileVisible(file2)
			await sidebar.expectFileNotVisible(file1)
		})

		test('move file to My files', async ({ sidebar }) => {
			const workspaceName = getRandomName()
			const file1 = getRandomName()
			const file2 = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createNewDocument(file2)
			await sidebar.createNewDocument(homeFileName)

			await sidebar.createWorkspace(workspaceName)
			await sidebar.moveFileToWorkspace(file1, workspaceName)
			await sidebar.moveFileToWorkspace(file2, workspaceName)

			await sidebar.switchToWorkspace(workspaceName)
			// make sure the file we move is not the active one
			await sidebar.getFileByName(file2).click()
			await sidebar.expectFileActive(file2)

			await sidebar.moveFileToHome(file1)
			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileVisible(file2)

			await sidebar.switchToWorkspace('My files')
			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(homeFileName)
		})

		test('move to menu offers only the other workspaces', async ({ page, sidebar }) => {
			const workspace1 = getRandomName()
			const workspace2 = getRandomName()
			const file1 = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createWorkspace(workspace1)
			await sidebar.createWorkspace(workspace2)

			// In My files: the current space is hidden, others offered
			await sidebar.openMoveToMenu(file1)
			await expect(page.getByRole('menuitem', { name: workspace1, exact: true })).toBeVisible()
			await expect(page.getByRole('menuitem', { name: workspace2, exact: true })).toBeVisible()
			await expect(page.getByRole('menuitem', { name: 'My files', exact: true })).not.toBeVisible()
			await sidebar.closeMoveToMenu()

			await sidebar.moveFileToWorkspace(file1, workspace1)

			// In a workspace: My files is offered, the current workspace is hidden
			await sidebar.switchToWorkspace(workspace1)
			await sidebar.openMoveToMenu(file1)
			await expect(page.getByRole('menuitem', { name: 'My files', exact: true })).toBeVisible()
			await expect(page.getByRole('menuitem', { name: workspace2, exact: true })).toBeVisible()
			await expect(page.getByRole('menuitem', { name: workspace1, exact: true })).not.toBeVisible()
			await sidebar.closeMoveToMenu()
		})

		test('drag file to a workspace moves it', async ({ sidebar }) => {
			const workspaceName = getRandomName()
			const file1 = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createNewDocument(homeFileName)
			await sidebar.createWorkspace(workspaceName)

			await sidebar.dragFileToWorkspace(file1, workspaceName)

			await sidebar.switchToWorkspace(workspaceName)
			await sidebar.expectFileVisible(file1)

			await sidebar.switchToWorkspace('My files')
			await sidebar.expectFileVisible(homeFileName)
			await sidebar.expectFileNotVisible(file1)
		})

		test('pin and unpin files', async ({ page, sidebar, editor }) => {
			const file1 = getRandomName()
			const file2 = getRandomName()
			const file3 = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createNewDocument(file2)
			await sidebar.createNewDocument(file3)

			await sidebar.expectFileNotPinned(file1)
			await sidebar.expectFileNotPinned(file2)
			await sidebar.expectFileNotPinned(file3)

			await sidebar.pinFile(file2)
			await sidebar.expectFilePinned(file2)

			let fileOrder = await sidebar.getVisibleFiles()
			expect(fileOrder[0]).toBe(file2)

			await sidebar.pinFile(file1)
			await sidebar.expectFilePinned(file1)

			fileOrder = await sidebar.getVisibleFiles()
			const file1Index = fileOrder.indexOf(file1)
			const file2Index = fileOrder.indexOf(file2)
			const file3Index = fileOrder.indexOf(file3)

			expect(file1Index).toBeLessThan(file3Index)
			expect(file2Index).toBeLessThan(file3Index)

			await sidebar.unpinFile(file2)
			await sidebar.expectFileNotPinned(file2)
			await sidebar.expectFilePinned(file1)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()

			await sidebar.expectFilePinned(file1)
			await sidebar.expectFileNotPinned(file2)
			await sidebar.expectFileNotPinned(file3)

			fileOrder = await sidebar.getVisibleFiles()
			expect(fileOrder[0]).toBe(file1)
		})

		test('delete file', async ({ page, sidebar, editor, deleteFileDialog }) => {
			const file1 = getRandomName()
			const file2 = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createNewDocument(file2)

			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(file2)

			await sidebar.deleteFileByName(file1)
			await deleteFileDialog.expectIsVisible()
			await deleteFileDialog.confirmDeletion()
			await deleteFileDialog.expectIsNotVisible()
			await sidebar.mutationResolution()

			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileVisible(file2)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()

			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileVisible(file2)
		})

		test('deleting the active file in a workspace stays in the workspace', async ({
			sidebar,
			deleteFileDialog,
		}) => {
			const workspaceName = getRandomName()
			const file1 = getRandomName()
			const file2 = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createNewDocument(file2)
			await sidebar.createNewDocument(homeFileName)

			await sidebar.createWorkspace(workspaceName)
			await sidebar.moveFileToWorkspace(file1, workspaceName)
			await sidebar.moveFileToWorkspace(file2, workspaceName)

			await sidebar.switchToWorkspace(workspaceName)
			await sidebar.getFileByName(file2).click()
			await sidebar.expectFileActive(file2)

			await sidebar.deleteFileByName(file2)
			await deleteFileDialog.expectIsVisible()
			await deleteFileDialog.confirmDeletion()
			await deleteFileDialog.expectIsNotVisible()
			await sidebar.mutationResolution()

			// We should land on the workspace's remaining file, not jump to My files.
			await sidebar.expectFileNotVisible(file2)
			await sidebar.expectActiveWorkspace(workspaceName)
			await sidebar.expectFileActive(file1)
		})

		test('duplicate file', async ({ page, sidebar, editor }) => {
			const file1 = getRandomName()
			const file1Copy = getRandomName()

			await sidebar.createNewDocument(file1)

			await sidebar.duplicateFileByName(file1, file1Copy)
			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(file1Copy)

			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()

			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(file1Copy)
		})
	})

	test.describe('sharing', () => {
		test.beforeEach(async ({ context }) => {
			await context.grantPermissions(['clipboard-read', 'clipboard-write'])
		})

		test('invite user to workspace', async ({ sidebar, browser, database }) => {
			const workspaceName = getRandomName()
			const fileName = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(fileName)
			await sidebar.createNewDocument(homeFileName)
			await sidebar.createWorkspace(workspaceName)
			await sidebar.moveFileToWorkspace(fileName, workspaceName)

			const inviteUrl = await sidebar.copyWorkspaceInviteLinkFromMenu(workspaceName)

			// Migrate invitee to groups backend but not frontend (tests auto-enable)
			await database.migrateUser(true)

			const parallelIndex = test.info().parallelIndex
			const { newSidebar, newEditor, newGroupInviteDialog, newContext, newPage } = await openNewTab(
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

			// Verify workspace visible (proves frontend flag was auto-enabled)
			await newSidebar.expectWorkspaceVisible(workspaceName)
			// Accepting navigates into the workspace, so its files are shown
			await newSidebar.expectFileVisible(fileName)

			const fileLink = await newSidebar.copyFileLinkByName(fileName)
			expect(fileLink).toContain(newPage.url())

			await newContext.close()
		})

		test('invite already member user to workspace', async ({ sidebar, browser, database }) => {
			const workspaceName = getRandomName()
			const fileName = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(fileName)
			await sidebar.createNewDocument(homeFileName)
			await sidebar.createWorkspace(workspaceName)
			await sidebar.moveFileToWorkspace(fileName, workspaceName)

			const inviteUrl = await sidebar.copyWorkspaceInviteLinkFromMenu(workspaceName)

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

			await newSidebar.expectWorkspaceVisible(workspaceName)
			await newSidebar.expectFileVisible(fileName)

			// Visiting the same invite link again lands the member back in the workspace
			const newTab = await openNewTab(browser, {
				url: inviteUrl,
				allowClipboard: true,
				userProps: { user: 'suppy', index: parallelIndex },
			})

			await newTab.newEditor.isLoaded()
			await newTab.newEditor.ensureSidebarOpen()
			await newTab.newSidebar.expectWorkspaceVisible(workspaceName)
			await newTab.newSidebar.expectFileVisible(fileName)

			await newTab.newContext.close()
			await newContext.close()
		})

		test('delete file removes for all workspace members', async ({
			sidebar,
			browser,
			database,
			deleteFileDialog,
		}) => {
			const workspaceName = getRandomName()
			const fileName = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(fileName)
			await sidebar.createNewDocument(homeFileName)
			await sidebar.createWorkspace(workspaceName)
			await sidebar.moveFileToWorkspace(fileName, workspaceName)

			const inviteUrl = await sidebar.copyWorkspaceInviteLinkFromMenu(workspaceName)
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

			await newSidebar.expectWorkspaceVisible(workspaceName)
			await newSidebar.expectFileVisible(fileName)

			// Delete file from original user
			await sidebar.switchToWorkspace(workspaceName)
			await sidebar.deleteFileByName(fileName)
			await deleteFileDialog.expectIsVisible()
			await deleteFileDialog.confirmDeletion()
			await deleteFileDialog.expectIsNotVisible()
			await sidebar.mutationResolution()

			await sidebar.expectFileNotVisible(fileName)

			// Verify file also removed for other user
			await newSidebar.expectFileNotVisible(fileName)

			await newContext.close()
		})

		test('delete workspace removes for all members', async ({ sidebar, browser, database }) => {
			const workspaceName = getRandomName()
			const fileName = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(fileName)
			await sidebar.createNewDocument(homeFileName)
			await sidebar.createWorkspace(workspaceName)
			await sidebar.moveFileToWorkspace(fileName, workspaceName)

			const inviteUrl = await sidebar.copyWorkspaceInviteLinkFromMenu(workspaceName)
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

			await newSidebar.expectWorkspaceVisible(workspaceName)

			// Delete workspace from original user
			await sidebar.deleteWorkspace(workspaceName)
			await sidebar.expectWorkspaceNotVisible(workspaceName)

			// Verify workspace also removed for other user
			await newSidebar.expectWorkspaceNotVisible(workspaceName)

			await newContext.close()
		})
	})
})
