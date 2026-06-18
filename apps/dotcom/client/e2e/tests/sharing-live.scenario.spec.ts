import { expect, test } from '../fixtures/scenario-test'

// Live share and workspace membership scenarios.
//
// These scenarios drive two browser contexts and assert on state that propagates between them via
// Zero sync. The membership/file waits gate on the data layer first (see Sidebar), but the heavy
// per-test setup plus genuinely variable cross-client sync latency on CI needs more than the default
// 30s per-test budget, so raise it for the suite.
test.describe.configure({ mode: 'parallel', timeout: 60_000 })

test.describe('live sharing scenarios', () => {
	test('owner and visitor see live edits through an edit link', async ({
		owner,
		visitor,
		scenario,
	}) => {
		await scenario.createGuestEditFile(owner, visitor, scenario.name('live edit file'))
		await visitor.editor.expectShapesCount(0)

		await owner.page.getByTestId('tools.rectangle').click()
		await owner.page.locator('.tl-background').click()

		await owner.editor.expectShapesCount(1)
		await visitor.editor.expectShapesCount(1)
	})

	test('owner sees collaborator presence join and leave live', async ({
		owner,
		visitor,
		scenario,
	}) => {
		await scenario.createGuestEditFile(owner, visitor, scenario.name('presence file'))
		await owner.expectCollaboratorCount(1)
		await visitor.expectCollaboratorCount(1)

		await visitor.close()
		await owner.waitForSessionClosed()
	})

	test('visitor permissions update while the shared file is open', async ({
		owner,
		visitor,
		scenario,
	}) => {
		await scenario.createGuestEditFile(owner, visitor, scenario.name('permission file'))
		await expect(visitor.page.getByTestId('tools.draw')).toBeVisible()

		await scenario.setSharedLinkType(owner, 'view')
		await expect(visitor.page.getByTestId('tools.draw')).not.toBeVisible({ timeout: 10000 })

		await scenario.setSharedLinkType(owner, 'edit')
		await expect(visitor.page.getByTestId('tools.draw')).toBeVisible({ timeout: 10000 })
	})

	test('view-only visitors see live owner changes without edit access', async ({
		owner,
		visitor,
		scenario,
	}) => {
		await scenario.createGuestViewFile(owner, visitor, scenario.name('view-only guest file'))

		await visitor.expectReadonly(true)
		await expect(visitor.page.getByTestId('tools.draw')).not.toBeVisible()
		await visitor.editor.expectShapesCount(0)

		await scenario.createRectangle(owner)
		await owner.editor.expectShapesCount(1)
		await visitor.editor.expectShapesCount(1)
	})

	test('signed-in non-member sees shared files as a live guest file', async ({
		owner,
		member,
		scenario,
	}) => {
		const fileName = scenario.name('signed-in guest file')
		await scenario.createGuestEditFile(owner, member, fileName)
		await member.editor.ensureSidebarOpen()
		await member.sidebar.expectFileVisible(fileName)
		await expect(member.page.getByTestId(`guest-badge-${fileName}`)).toBeVisible()
		await expect(member.page.getByTestId('tools.draw')).toBeVisible()

		await scenario.setSharedLinkType(owner, 'view')
		await expect(member.page.getByTestId('tools.draw')).not.toBeVisible({ timeout: 10000 })
	})

	test('unshare removes visitor access while the file is open', async ({
		owner,
		visitor,
		scenario,
	}) => {
		const { sharedUrl } = await scenario.createSharedFile(
			owner,
			'edit',
			scenario.name('unshare file')
		)

		await visitor.goto(sharedUrl)
		await expect(visitor.shareMenu.shareButton).toBeVisible()
		await expect(visitor.page.getByTestId('tla-error-icon')).not.toBeVisible()

		await scenario.setSharedLinkType(owner, 'no-access')
		await expect(visitor.shareMenu.shareButton).not.toBeVisible({ timeout: 10000 })
		await expect(visitor.page.getByTestId('tla-error-icon')).toBeVisible({ timeout: 10000 })
	})

	test('published snapshots update only after publishing changes', async ({
		owner,
		visitor,
		scenario,
	}) => {
		const { publishedUrl } = await scenario.createPublishedFile(
			owner,
			scenario.name('published snapshot file')
		)

		await visitor.goto(publishedUrl)
		await visitor.editor.expectShapesCount(0)

		await scenario.createRectangle(owner)
		await owner.editor.expectShapesCount(1)

		await visitor.page.reload()
		await visitor.waitForAppReady()
		await visitor.editor.expectShapesCount(0)

		await scenario.publishChanges(owner)
		await visitor.page.reload()
		await visitor.waitForAppReady()
		await visitor.editor.expectShapesCount(1)
	})

	test('workspace file deletion removes the file from active members without reload', async ({
		owner,
		member,
		scenario,
	}) => {
		const { workspaceName, fileName } = await scenario.createWorkspaceWithMember({
			owner,
			member,
			workspaceName: scenario.name('delete file workspace'),
			fileName: scenario.name('live deleted workspace file'),
		})

		await owner.sidebar.switchToWorkspace(workspaceName)
		await owner.sidebar.deleteFileByName(fileName)
		await owner.deleteFileDialog.expectIsVisible()
		await owner.deleteFileDialog.confirmDeletion()
		await owner.deleteFileDialog.expectIsNotVisible()
		await owner.sidebar.expectFileNotVisible(fileName)

		await member.sidebar.expectFileNotVisible(fileName)
	})

	test('workspace invite acceptance appears in owner settings without reload', async ({
		owner,
		member,
		scenario,
	}) => {
		const { workspaceName, fileName, inviteUrl, memberUserId } =
			await scenario.createPendingWorkspaceInvite({
				owner,
				member,
				workspaceName: scenario.name('pending invite workspace'),
				fileName: scenario.name('pending invite file'),
			})
		const memberRoleSelect = owner.page.locator(`[id="workspace-member-role-${memberUserId}"]`)

		await owner.sidebar.openWorkspaceSettings(workspaceName)
		await expect(memberRoleSelect).not.toBeVisible()

		await member.goto(inviteUrl)
		await member.editor.ensureSidebarOpen()
		await member.workspaceInviteDialog.expectIsVisible()
		await member.workspaceInviteDialog.acceptInvitation()
		await member.waitForMutationResolution()
		await member.sidebar.expectWorkspaceVisible(workspaceName)
		await member.sidebar.expectFileVisible(fileName)

		await expect(memberRoleSelect).toBeVisible({ timeout: 10000 })
		await owner.page.keyboard.press('Escape')
	})

	test('member removal revokes the active member window without reload', async ({
		owner,
		member,
		scenario,
	}) => {
		const { workspaceName, fileName } = await scenario.createWorkspaceWithRemovedMember({
			owner,
			member,
			workspaceName: scenario.name('member removal workspace'),
			fileName: scenario.name('member removal file'),
		})

		await member.sidebar.expectWorkspaceNotVisible(workspaceName)
		await member.sidebar.expectFileNotVisible(fileName)
	})

	test('workspace role changes update active members without reload', async ({
		owner,
		member,
		scenario,
	}) => {
		const { workspaceName, fileName, memberUserId } = await scenario.createWorkspaceWithMember({
			owner,
			member,
			workspaceName: scenario.name('role change workspace'),
			fileName: scenario.name('role change file'),
		})

		await member.sidebar.expectWorkspaceVisible(workspaceName)
		await member.sidebar.expectFileVisible(fileName)

		await member.sidebar.openWorkspaceSettings(workspaceName)
		// Delete lives on the Settings tab and only for owners; promoting the member should
		// surface it there reactively, without a reload.
		await member.page.getByRole('tab', { name: 'Settings' }).click()
		const deleteWorkspaceButton = member.page.getByRole('button', { name: /Delete workspace/ })
		await expect(deleteWorkspaceButton).not.toBeVisible()

		await scenario.setWorkspaceMemberRole({
			owner,
			workspaceName,
			memberUserId,
			role: 'owner',
		})

		await expect(deleteWorkspaceButton).toBeVisible({ timeout: 10000 })
		await member.page.keyboard.press('Escape')
	})

	test('workspace deletion removes the workspace from active members without reload', async ({
		owner,
		member,
		scenario,
	}) => {
		const { workspaceName, fileName } = await scenario.createWorkspaceWithMember({
			owner,
			member,
			workspaceName: scenario.name('live workspace'),
			fileName: scenario.name('shared workspace file'),
		})

		await member.sidebar.expectWorkspaceVisible(workspaceName)
		await member.sidebar.expectFileVisible(fileName)

		await owner.sidebar.deleteWorkspace(workspaceName)
		await owner.sidebar.expectWorkspaceNotVisible(workspaceName)

		await member.sidebar.expectWorkspaceNotVisible(workspaceName)
		await member.sidebar.expectFileNotVisible(fileName)
	})
})
