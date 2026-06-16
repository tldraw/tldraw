import { expect, test } from '../fixtures/scenario-test'

const ROOT_URL = 'http://localhost:3000'

test.describe.configure({ mode: 'serial' })

test.describe('UI scenarios', () => {
	test('file creation and inline rename submit/cancel stay in sync', async ({
		owner,
		scenario,
	}) => {
		const originalName = scenario.name('created file')
		const cancelledName = scenario.name('cancelled file')
		const submittedName = scenario.name('submitted file')

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
		await owner.waitForMutationResolution()

		await expect(submitInput).not.toBeVisible()
		await owner.sidebar.expectFileVisible(submittedName)
		await owner.sidebar.expectFileNotVisible(originalName)
		await owner.sidebar.expectFileActive(submittedName)
		expect(await owner.editor.getCurrentFileName()).toBe(submittedName)
	})

	test('file menu commands update the file list and active file', async ({ owner, scenario }) => {
		const originalName = scenario.name('menu original')
		const renamedName = scenario.name('menu renamed')
		const duplicateName = scenario.name('menu duplicate')

		await scenario.createPersonalFile(owner, originalName)
		await scenario.createRectangle(owner)

		await owner.sidebar.renameFileByName(originalName, renamedName)
		await owner.sidebar.expectFileVisible(renamedName)
		await owner.sidebar.expectFileNotVisible(originalName)
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
		await owner.editor.expectShapesCount(1)

		await owner.sidebar.deleteFileByName(duplicateName)
		await owner.deleteFileDialog.expectIsVisible()
		await owner.deleteFileDialog.confirmDeletion()
		await owner.deleteFileDialog.expectIsNotVisible()
		await owner.waitForMutationResolution()

		await owner.sidebar.expectFileNotVisible(duplicateName)
		await owner.sidebar.expectFileVisible(renamedName)
		await expect(owner.page.getByTestId('tla-editor')).toBeVisible()
	})

	test('pinned section only appears while files are pinned', async ({ owner, scenario }) => {
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
	})

	test('toggling the sidebar preserves the active editor and file selection', async ({
		owner,
		scenario,
	}) => {
		const fileName = scenario.name('sidebar toggle file')

		await scenario.createPersonalFile(owner, fileName)
		await owner.editor.ensureSidebarClosed()
		await expect(owner.page.getByTestId('canvas')).toBeVisible()
		expect(await owner.editor.getCurrentFileName()).toBe(fileName)

		await owner.editor.ensureSidebarOpen()
		await owner.sidebar.expectFileActive(fileName)
		expect(await owner.editor.getCurrentFileName()).toBe(fileName)
	})

	test('workspace creation, moving, and deletion update navigation', async ({
		owner,
		scenario,
	}) => {
		const workspaceName = scenario.name('workspace nav')
		const fileName = scenario.name('workspace movable file')

		await scenario.ensureGroupsReady(owner)
		await scenario.createPersonalFile(owner, fileName)

		await owner.sidebar.createWorkspace(workspaceName)
		await owner.sidebar.expectActiveWorkspace(workspaceName)
		await owner.sidebar.expectWorkspaceVisible(workspaceName)

		await owner.sidebar.switchToWorkspace('Home')
		await owner.sidebar.moveFileToWorkspace(fileName, workspaceName)
		await owner.sidebar.expectActiveWorkspace(workspaceName)
		await owner.sidebar.expectFileVisible(fileName)

		await owner.sidebar.switchToWorkspace('Home')
		await owner.sidebar.expectFileNotVisible(fileName)
		await owner.sidebar.switchToWorkspace(workspaceName)

		await owner.sidebar.deleteWorkspace(workspaceName)
		await owner.sidebar.expectWorkspaceNotVisible(workspaceName)
		await owner.sidebar.expectFileNotVisible(fileName)
		await owner.sidebar.expectActiveWorkspace('Home')
	})

	test('share and publish controls expose current access and published URLs', async ({
		owner,
		visitor,
		scenario,
	}) => {
		await scenario.createPersonalFile(owner, scenario.name('publish controls file'))

		await owner.shareMenu.open()
		await expect(owner.shareMenu.inviteTabButton).toBeVisible()
		await expect(owner.shareMenu.exportTabButton).toBeVisible()
		await expect(owner.shareMenu.publishTabButton).toBeVisible()
		await expect(owner.shareMenu.inviteTabPage).toBeVisible()
		await expect(owner.page.getByTestId('shared-link-shared-switch')).toBeVisible()
		await owner.page.keyboard.press('Escape')

		const publishedUrl = await scenario.publishFile(owner)
		expect(new URL(publishedUrl).pathname).toMatch(/^\/p\//)

		await visitor.page.goto(publishedUrl, { waitUntil: 'load' })
		await expect(visitor.page.getByTestId('tla-editor')).toBeVisible()
		await visitor.editor.expectShapesCount(0)

		await owner.shareMenu.open()
		await owner.shareMenu.unpublishFile()
		await owner.page.keyboard.press('Escape')
		await owner.waitForMutationResolution()

		await visitor.page.goto(publishedUrl, { waitUntil: 'load' })
		await expect(visitor.page.getByTestId('tla-error-icon')).toBeVisible()
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
		await expect(owner.page.getByTestId('tla-error-icon')).toBeVisible()

		await visitor.page.goto(missingFileUrl, { waitUntil: 'load' })
		await expect(async () => {
			await visitor.errorPage.expectNotFoundVisible()
		}).toPass()
		await expect(visitor.page.getByTestId('tla-error-icon')).toBeVisible()
	})

	test('anonymous export downloads an image file', async ({ visitor }) => {
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

	test('workspace settings reflect role-specific controls', async ({ owner, member, scenario }) => {
		const { workspaceName, fileName, memberUserId } = await scenario.createWorkspaceWithMember({
			owner,
			member,
			workspaceName: scenario.name('settings controls workspace'),
			fileName: scenario.name('settings controls file'),
		})

		await owner.sidebar.openWorkspaceSettings(workspaceName)
		const ownerDialog = owner.page.getByRole('dialog', { name: 'Workspace settings' })

		// Owners see the full dialog surface and member roster.
		await expect(ownerDialog).toBeVisible()
		await expect(ownerDialog.getByPlaceholder('Workspace name')).toBeVisible()
		await expect(ownerDialog.getByText('Invite members')).toBeVisible()
		await expect(ownerDialog.getByRole('button', { name: 'Copy invite link' })).toBeVisible()
		await expect(ownerDialog.getByText(/Members\s*\(2\)/)).toBeVisible()
		await expect(ownerDialog.getByText(/\(you\)/)).toBeVisible()
		await expect(ownerDialog.locator(`[id="workspace-member-role-${memberUserId}"]`)).toHaveText(
			'Member'
		)

		// Copying and regenerating the invite link update clipboard-visible state.
		const inviteInput = ownerDialog.locator('input[readonly]').first()
		const firstInviteUrl = await inviteInput.inputValue()
		expect(new URL(firstInviteUrl).pathname).toMatch(/^\/invite\//)

		await ownerDialog.getByRole('button', { name: 'Copy invite link' }).click()
		await expect
			.poll(() => owner.page.evaluate(() => navigator.clipboard.readText()))
			.toBe(firstInviteUrl)

		await ownerDialog.getByRole('button', { name: 'Regenerate invite link' }).click()
		await expect.poll(() => inviteInput.inputValue()).not.toBe(firstInviteUrl)
		const regeneratedInviteUrl = await inviteInput.inputValue()
		expect(new URL(regeneratedInviteUrl).pathname).toMatch(/^\/invite\//)

		await owner.page.waitForTimeout(1100)
		await ownerDialog.getByRole('button', { name: 'Copy invite link' }).click()
		await expect
			.poll(() => owner.page.evaluate(() => navigator.clipboard.readText()))
			.toBe(regeneratedInviteUrl)
		await owner.page.keyboard.press('Escape')

		// Non-owners can inspect settings but cannot access owner-only controls.
		await member.sidebar.openWorkspaceSettings(workspaceName)
		const memberDialog = member.page.getByRole('dialog', { name: 'Workspace settings' })
		await expect(memberDialog.getByPlaceholder('Workspace name')).toBeDisabled()
		await expect(
			memberDialog.locator(`[id="workspace-member-role-${memberUserId}"]`)
		).not.toBeVisible()
		await expect(memberDialog.getByRole('button', { name: /Delete workspace/ })).not.toBeVisible()
		await expect(memberDialog.getByRole('button', { name: /Leave workspace/ })).toBeVisible()

		// Leaving requires confirmation and removes the member's workspace access.
		await memberDialog.getByRole('button', { name: /Leave workspace/ }).click()
		await member.page.getByRole('button', { name: 'Leave workspace' }).click()
		await member.waitForMutationResolution()
		await member.sidebar.expectWorkspaceNotVisible(workspaceName)
		await member.sidebar.expectFileNotVisible(fileName)
	})

	test('workspace settings rename updates labels and persists', async ({ owner, scenario }) => {
		const workspaceName = scenario.name('settings rename old')
		const newWorkspaceName = scenario.name('settings rename new')

		await scenario.ensureGroupsReady(owner)
		await owner.sidebar.createWorkspace(workspaceName)
		await owner.sidebar.renameWorkspace(workspaceName, newWorkspaceName)

		await owner.sidebar.expectActiveWorkspace(newWorkspaceName)
		await owner.sidebar.expectWorkspaceVisible(newWorkspaceName)
		await owner.sidebar.expectWorkspaceNotVisible(workspaceName)

		await owner.page.reload()
		await owner.waitForAppReady()
		await owner.editor.ensureSidebarOpen()
		await owner.sidebar.expectWorkspaceVisible(newWorkspaceName)
		await owner.sidebar.expectWorkspaceNotVisible(workspaceName)
	})
})
