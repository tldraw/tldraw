import { expect, test } from '../fixtures/scenario-test'

const ROOT_URL = 'http://localhost:3000'

test.describe.configure({ mode: 'serial' })

test.describe('UI scenarios', () => {
	test('file creation, inline rename, and file menu commands update the file list and active file', async ({
		owner,
		scenario,
	}) => {
		const originalName = scenario.name('created file')
		const cancelledName = scenario.name('cancelled file')
		const submittedName = scenario.name('submitted file')
		const renamedName = scenario.name('menu renamed')
		const duplicateName = scenario.name('menu duplicate')

		await scenario.createPersonalFile(owner, originalName)
		const fileUrl = owner.page.url()
		expect(new URL(fileUrl).pathname).toMatch(/^\/f\//)
		await owner.sidebar.expectFileVisible(originalName)
		await owner.sidebar.expectFileActive(originalName)
		expect(await owner.editor.getCurrentFileName()).toBe(originalName)

		await owner.goto(fileUrl)
		await owner.editor.ensureSidebarOpen()
		await owner.sidebar.expectFileActive(originalName)
		expect(await owner.editor.getCurrentFileName()).toBe(originalName)

		await owner.sidebar.getFileByName(originalName).dblclick()
		const cancelInput = owner.page.getByTestId('tla-sidebar-rename-input')
		await expect(cancelInput).toBeFocused()
		await cancelInput.fill(cancelledName)
		await owner.page.keyboard.press('Escape')

		await expect(cancelInput).not.toBeVisible()
		await owner.sidebar.expectFileVisible(originalName)
		await owner.sidebar.expectFileNotVisible(cancelledName)
		expect(await owner.editor.getCurrentFileName()).toBe(originalName)

		await owner.sidebar.getFileByName(originalName).dblclick()
		const submitInput = owner.page.getByTestId('tla-sidebar-rename-input')
		await expect(submitInput).toBeFocused()
		await submitInput.fill(submittedName)
		await owner.page.keyboard.press('Enter')

		await expect(submitInput).not.toBeVisible()
		await owner.sidebar.expectFileVisible(submittedName)
		await owner.sidebar.expectFileNotVisible(originalName)
		await owner.sidebar.expectFileActive(submittedName)
		expect(await owner.editor.getCurrentFileName()).toBe(submittedName)

		await scenario.createRectangle(owner)
		// Duplicating below copies the room's server-side persisted content (see
		// TLFileDurableObject.handleFileCreateFromSource), which only reflects shapes that have
		// round-tripped over the room's own sync websocket (independent of Zero/app mutations).
		// expectShapesCount above only proves the shape rendered locally; give the push time to
		// reach the server before duplicating, or the copy can race the still-in-flight change and
		// silently omit the shape.
		// TODO: replace with a condition-based wait — needs a __test__ route exposing the room DO's
		// persisted doc state (no such signal exists today), a fixed timeout can still lose the race.
		await owner.page.waitForTimeout(1000)

		await owner.sidebar.renameFileByName(submittedName, renamedName)
		await owner.sidebar.expectFileVisible(renamedName)
		await owner.sidebar.expectFileNotVisible(submittedName)
		await owner.sidebar.expectFileActive(renamedName)
		expect(await owner.editor.getCurrentFileName()).toBe(renamedName)

		const copiedLink = await owner.sidebar.copyFileLinkByName(renamedName)
		expect(new URL(copiedLink).origin).toBe(ROOT_URL)
		expect(new URL(copiedLink).pathname).toMatch(/^\/f\//)

		await owner.sidebar.duplicateFileByName(renamedName, duplicateName)
		await owner.sidebar.expectFileVisible(renamedName)
		await owner.sidebar.expectFileVisible(duplicateName)
		await owner.sidebar.expectFileActive(duplicateName)
		expect(await owner.editor.getCurrentFileName()).toBe(duplicateName)
		// Duplicating copies the room server-side, so the new file's shapes only render once the
		// editor navigates and loads the copied content. Allow more than the default 5s for that.
		await owner.editor.expectShapesCount(1, 15000)

		await owner.sidebar.deleteFileByName(duplicateName)
		await owner.deleteFileDialog.expectIsVisible()
		await owner.deleteFileDialog.confirmDeletion()
		await owner.deleteFileDialog.expectIsNotVisible()

		await owner.sidebar.expectFileNotVisible(duplicateName)
		await owner.sidebar.expectFileVisible(renamedName)
		await expect(owner.page.getByTestId('tla-editor')).toBeVisible()
	})

	test('pinning and sidebar toggling keep the active file', async ({ owner, scenario }) => {
		const fileName = scenario.name('pinned file')

		await scenario.createPersonalFile(owner, fileName)
		await expect(owner.page.getByTestId('tla-file-link-pinned-0')).not.toBeVisible()

		await owner.sidebar.pinFile(fileName)
		await owner.sidebar.expectFilePinned(fileName)
		await expect(owner.page.getByTestId('tla-file-link-pinned-0')).toContainText(fileName)
		await owner.sidebar.expectFileActive(fileName)

		await owner.sidebar.unpinFile(fileName)
		await owner.sidebar.expectFileNotPinned(fileName)
		await expect(owner.page.getByTestId('tla-file-link-pinned-0')).not.toBeVisible()
		await owner.sidebar.expectFileActive(fileName)

		await owner.editor.ensureSidebarClosed()
		await expect(owner.page.getByTestId('canvas')).toBeVisible()
		expect(await owner.editor.getCurrentFileName()).toBe(fileName)

		await owner.editor.ensureSidebarOpen()
		await owner.sidebar.expectFileActive(fileName)
		expect(await owner.editor.getCurrentFileName()).toBe(fileName)
	})

	test('workspace creation, moving, renaming, and deletion update navigation', async ({
		owner,
		scenario,
	}) => {
		const workspaceName = scenario.name('workspace nav')
		const renamedWorkspaceName = scenario.name('nav renamed')
		const fileName = scenario.name('workspace movable file')

		await scenario.createPersonalFile(owner, fileName)

		await owner.sidebar.createWorkspace(workspaceName)
		await owner.sidebar.expectActiveWorkspace(workspaceName)
		await owner.sidebar.expectWorkspaceVisible(workspaceName)

		await owner.sidebar.switchToHomeWorkspace()
		// Moving the open file follows it into the workspace. Home reopens its last visited file, and a
		// file left within 1s of opening isn't recorded as visited, so open it explicitly.
		await owner.sidebar.getFileByName(fileName).click()
		await owner.sidebar.expectFileActive(fileName)
		await owner.sidebar.moveFileToWorkspace(fileName, workspaceName)
		await owner.sidebar.expectActiveWorkspace(workspaceName)
		await owner.sidebar.expectFileVisible(fileName)

		await owner.sidebar.switchToHomeWorkspace()
		await owner.sidebar.expectFileNotVisible(fileName)
		await owner.sidebar.switchToWorkspace(workspaceName)

		await owner.sidebar.renameWorkspace(workspaceName, renamedWorkspaceName)
		await owner.sidebar.expectActiveWorkspace(renamedWorkspaceName)
		await owner.sidebar.expectWorkspaceVisible(renamedWorkspaceName)
		await owner.sidebar.expectWorkspaceNotVisible(workspaceName)

		await owner.page.reload()
		await owner.waitForAppReady()
		await owner.editor.ensureSidebarOpen()
		await owner.sidebar.expectWorkspaceVisible(renamedWorkspaceName)
		await owner.sidebar.expectWorkspaceNotVisible(workspaceName)

		await owner.sidebar.deleteWorkspace(renamedWorkspaceName)
		await owner.sidebar.expectWorkspaceNotVisible(renamedWorkspaceName)
		await owner.sidebar.expectFileNotVisible(fileName)
		await owner.sidebar.expectActiveHomeWorkspace()
	})

	test('missing files show not-found UI to signed-in and signed-out users', async ({
		owner,
		visitor,
	}) => {
		const missingFileUrl = `${ROOT_URL}/f/${Math.random().toString(36).substring(2, 15)}`

		await owner.page.goto(missingFileUrl, { waitUntil: 'load' })
		await expect(async () => {
			await owner.errorPage.expectNotFoundVisible()
		}).toPass()
		await expect(owner.page.getByTestId('tla-error')).toBeVisible()

		await visitor.page.goto(missingFileUrl, { waitUntil: 'load' })
		await expect(async () => {
			await visitor.errorPage.expectNotFoundVisible()
		}).toPass()
		await expect(visitor.page.getByTestId('tla-error')).toBeVisible()
	})

	test('anonymous export downloads an image file', async ({ visitor }) => {
		await visitor.goto()
		await visitor.homePage.expectSignInButtonVisible()
		await visitor.page.evaluate(() => {
			const editor = (window as any).editor
			editor.createShapes([
				{
					type: 'geo',
					x: 100,
					y: 100,
					props: { geo: 'rectangle', w: 100, h: 100 },
				},
			])
		})

		await visitor.shareMenu.open()
		await visitor.shareMenu.ensureTabSelected('export')
		await expect(visitor.shareMenu.exportTabPage).toBeVisible()

		const downloadPromise = visitor.page.waitForEvent('download')
		await visitor.shareMenu.exportImageButton.click()
		const download = await downloadPromise
		expect(download.suggestedFilename()).toMatch(/\.(png|svg)$/)
	})

	test('the home workspace has a private settings dialog that renames it', async ({
		owner,
		scenario,
	}) => {
		// Regression: the home workspace ("My workspace") used to render an empty dialog — the
		// component returned null for it while the sidebar still opened the dialog, so the page
		// just dimmed with no content. It's private: it can be renamed, but not shared or managed.
		await owner.editor.ensureSidebarOpen()
		await owner.sidebar.switchToHomeWorkspace()
		await owner.page.getByTestId('tla-sidebar-workspace-settings').click()

		const dialog = owner.page.getByRole('dialog', { name: 'Manage workspace' })
		await expect(dialog).toBeVisible()
		// Renameable: the name field is present and editable.
		await expect(dialog.getByPlaceholder('Workspace name')).toBeEnabled()
		// Private: a disabled invite control with an explanatory note (no shareable link).
		await expect(
			dialog.getByText(
				'This is your private workspace. Create a new workspace to invite teammates.'
			)
		).toBeVisible()
		await expect(dialog.getByRole('button', { name: 'Copy invite link' })).toBeDisabled()
		// Nothing to manage, so the dialog has no Members/Settings tabs at all.
		await expect(dialog.getByRole('tab')).toHaveCount(0)

		const newName = scenario.name('home renamed')
		await dialog.getByPlaceholder('Workspace name').fill(newName)
		await owner.page.getByRole('button', { name: 'Close' }).click()
		await owner.sidebar.expectActiveWorkspace(newName)
	})
})
