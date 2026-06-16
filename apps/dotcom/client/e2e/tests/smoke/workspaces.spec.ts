import { getRandomName, openNewTab } from '../../fixtures/helpers'
import { expect, test } from '../../fixtures/tla-test'

// The sidebar has a workspace switcher dropdown at the top ("Home" + the
// user's workspaces + a create item), action rows for the active non-home
// workspace (new board, invite teammates, workspace settings), and the active
// workspace's files below. Switching to a workspace opens its top file — first pinned,
// otherwise most recent (creating one if it's empty) — and creating a
// workspace switches to it.
test.describe('workspaces', () => {
	test.beforeEach(async ({ database, editor }) => {
		await database.migrateUser()
		await database.enableGroupsFrontend()
		await editor.isLoaded()
		await editor.ensureSidebarOpen()
	})

	test.describe('basic operations', () => {
		test('create workspace button is only shown when there are no workspaces', async ({
			page,
			sidebar,
		}) => {
			await expect(sidebar.createWorkspaceButton).toBeVisible()

			const workspaceName = getRandomName()
			await sidebar.createWorkspace(workspaceName)

			await expect(sidebar.createWorkspaceButton).not.toBeVisible()

			// creating is still available from the workspace switcher dropdown
			await sidebar.openWorkspaceSwitcher()
			await expect(page.getByTestId('tla-create-workspace-menu-item')).toBeVisible()
			await page.keyboard.press('Escape')
		})

		test('reopening the switcher right after switching keeps it open', async ({
			page,
			sidebar,
		}) => {
			// Regression test for the workspace switcher dismissing itself when reopened
			// mid-switch. Selecting a workspace navigates immediately, but the target
			// file's canvas loads asynchronously and (deep links are on for the file
			// route) rewrites the URL with a `?d=` param once its editor mounts. The
			// switcher's open state used to be scoped to the active file editor's
			// context, so when the outgoing editor was disposed as the incoming canvas
			// loaded, it cleared the just-reopened switcher's menu state.
			const workspaceName = getRandomName()
			await sidebar.createWorkspace(workspaceName)

			const trigger = page.getByTestId('tla-workspace-switcher')
			const homeItem = page.getByTestId('tla-workspace-switcher-home')

			// Begin switching back to Home; the selection closes the menu.
			await sidebar.openWorkspaceSwitcher()
			await homeItem.click()
			await expect(homeItem).toBeHidden()

			// Reopen immediately, before the incoming canvas has finished loading. Use a
			// single click, not sidebar.openWorkspaceSwitcher(), whose retry loop would
			// mask a dismissal by simply reopening the menu.
			await trigger.click()
			await expect(homeItem).toBeVisible()

			// The switcher must stay open while the incoming canvas finishes loading and
			// rewrites the URL with `?d=` — that load is what used to dismiss it.
			await page.waitForURL(/[?&]d=/, { timeout: 15000 })
			await sidebar.expectActiveWorkspace('Home')
			await expect(homeItem).toBeVisible()
		})

		test('create file button creates in the active workspace', async ({ sidebar }) => {
			const workspaceName = getRandomName()
			const file1 = getRandomName()
			const file2 = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createNewDocument(homeFileName)

			await sidebar.createWorkspace(workspaceName)
			await sidebar.switchToWorkspace('Home')
			await sidebar.moveFileToWorkspace(file1, workspaceName)

			await sidebar.switchToWorkspace(workspaceName)
			await sidebar.createNewDocument(file2)

			await sidebar.expectActiveWorkspace(workspaceName)
			const filesInWorkspace = await sidebar.getVisibleFiles()
			expect(filesInWorkspace).toContain(file1)
			expect(filesInWorkspace).toContain(file2)

			await sidebar.switchToWorkspace('Home')
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
			await sidebar.switchToWorkspace('Home')
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
			await sidebar.switchToWorkspace('Home')
			await sidebar.moveFileToWorkspace(file1, workspaceName)
			await sidebar.moveFileToWorkspace(file2, workspaceName)

			await sidebar.switchToWorkspace(workspaceName)
			// make sure the file we move is not the active one
			await sidebar.getFileByName(file2).click()
			await sidebar.expectFileActive(file2)

			await sidebar.moveFileToHome(file1)
			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileVisible(file2)

			await sidebar.switchToWorkspace('Home')
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
			await sidebar.switchToWorkspace('Home')

			// In Home: the current workspace is hidden, others offered (the move-to
			// menu still labels home as "My files")
			await sidebar.openMoveToMenu(file1)
			await expect(page.getByRole('menuitem', { name: workspace1, exact: true })).toBeVisible()
			await expect(page.getByRole('menuitem', { name: workspace2, exact: true })).toBeVisible()
			await expect(page.getByRole('menuitem', { name: 'My files', exact: true })).not.toBeVisible()
			await sidebar.closeMoveToMenu()

			await sidebar.moveFileToWorkspace(file1, workspace1)

			// In a workspace: home is offered, the current workspace is hidden
			await sidebar.switchToWorkspace(workspace1)
			await sidebar.openMoveToMenu(file1)
			await expect(page.getByRole('menuitem', { name: 'My files', exact: true })).toBeVisible()
			await expect(page.getByRole('menuitem', { name: workspace2, exact: true })).toBeVisible()
			await expect(page.getByRole('menuitem', { name: workspace1, exact: true })).not.toBeVisible()
			await sidebar.closeMoveToMenu()
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

		test('drag to pin and unpin files in a workspace', async ({ sidebar }) => {
			const workspaceName = getRandomName()
			const file1 = getRandomName()

			await sidebar.createWorkspace(workspaceName)
			await sidebar.createNewDocument(file1)

			await sidebar.expectFileNotPinned(file1)
			await sidebar.dragFileToPinnedSection(file1)
			await sidebar.expectFilePinned(file1)

			await sidebar.dragFileToUnpinnedSection(file1)
			await sidebar.expectFileNotPinned(file1)
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
			await sidebar.switchToWorkspace('Home')
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
	})

	test.describe('sharing', () => {
		test.beforeEach(async ({ context }) => {
			await context.grantPermissions(['clipboard-read', 'clipboard-write'])
		})

		test('invite already member user to workspace', async ({ sidebar, browser, database }) => {
			const workspaceName = getRandomName()
			const fileName = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(fileName)
			await sidebar.createNewDocument(homeFileName)
			await sidebar.createWorkspace(workspaceName)
			await sidebar.switchToWorkspace('Home')
			await sidebar.moveFileToWorkspace(fileName, workspaceName)

			const inviteUrl = await sidebar.copyWorkspaceInviteLink(workspaceName)

			// Migrate invitee to groups backend but not frontend (tests auto-enable)
			await database.migrateUser(true)

			const parallelIndex = test.info().parallelIndex
			const { newSidebar, newEditor, newWorkspaceInviteDialog, newContext } = await openNewTab(
				browser,
				{
					url: inviteUrl,
					allowClipboard: true,
					userProps: { user: 'suppy', index: parallelIndex },
				}
			)

			await newEditor.isLoaded()
			await newEditor.ensureSidebarOpen()
			await newWorkspaceInviteDialog.acceptInvitation()

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
	})
})
