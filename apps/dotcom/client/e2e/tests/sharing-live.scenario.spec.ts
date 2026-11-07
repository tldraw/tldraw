import { expect, selectTlaMenuOption, test } from '../fixtures/scenario-test'

// Live share and workspace membership scenarios.
//
// These scenarios drive two browser contexts and assert on state that propagates between them via
// Zero sync. The membership/file waits gate on the data layer first (see Sidebar), but the heavy
// per-test setup plus genuinely variable cross-client sync latency on CI needs more than the default
// 30s per-test budget, so raise it for the suite.
test.describe.configure({ mode: 'parallel', timeout: 60_000 })

test.describe('live sharing scenarios', () => {
	test('edit-link visitors see presence, live permission changes, and edit the file', async ({
		owner,
		visitor,
		scenario,
	}) => {
		await scenario.createGuestEditFile(owner, visitor, scenario.name('permission file'))
		await owner.expectCollaboratorCount(1)
		await visitor.expectCollaboratorCount(1)
		await expect(visitor.page.getByTestId('tools.draw')).toBeVisible()

		await scenario.setSharedLinkType(owner, 'view')
		await expect(visitor.page.getByTestId('tools.draw')).not.toBeVisible({ timeout: 10000 })

		await scenario.setSharedLinkType(owner, 'edit')
		await expect(visitor.page.getByTestId('tools.draw')).toBeVisible({ timeout: 10000 })

		await scenario.createRectangle(visitor)
		await owner.editor.expectShapesCount(1)

		// Each link type flip reconnects the visitor, so confirm presence is back before it leaves.
		await owner.expectCollaboratorCount(1)
		await visitor.close()
		await owner.waitForSessionClosed()
	})

	test('view-only visitors see live owner changes until the file is unshared', async ({
		owner,
		visitor,
		scenario,
	}) => {
		await scenario.createGuestViewFile(owner, visitor, scenario.name('view-only guest file'))

		await visitor.expectReadonly(true)
		await expect(visitor.page.getByTestId('tools.draw')).not.toBeVisible()
		await expect(visitor.shareMenu.shareButton).toBeVisible()
		await expect(visitor.page.getByTestId('tla-error')).not.toBeVisible()
		await visitor.editor.expectShapesCount(0)

		await scenario.createRectangle(owner)
		await owner.editor.expectShapesCount(1)
		await visitor.editor.expectShapesCount(1)

		await scenario.setSharedLinkType(owner, 'no-access')
		await expect(visitor.shareMenu.shareButton).not.toBeVisible({ timeout: 10000 })
		await expect(visitor.page.getByTestId('tla-error')).toBeVisible({ timeout: 10000 })
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

		const guestFileLink = member.sidebar.getFileByName(fileName).getByRole('link')
		await guestFileLink.focus()
		await member.page.keyboard.press('Enter')
		await expect(member.page.getByTestId('tla-sidebar-rename-input')).not.toBeVisible()
		await expect(guestFileLink).toBeFocused()

		await scenario.setSharedLinkType(owner, 'view')
		await expect(member.page.getByTestId('tools.draw')).not.toBeVisible({ timeout: 10000 })
	})

	test('opening a guest file does not trap the member outside their home after they join its workspace', async ({
		owner,
		member,
		scenario,
	}) => {
		// owner makes a workspace with a (shared) file owned by that workspace, plus an invite.
		const { workspaceName, fileName, inviteUrl } = await scenario.createPendingWorkspaceInvite({
			owner,
			member,
		})
		const fileUrl = owner.page.url() // owner is left viewing the workspace file, which is shared

		// member opens that file via its link while NOT a member of the workspace: it gets mirrored
		// into their home as a guest file (visible in their sidebar).
		await member.goto(fileUrl)
		await member.editor.ensureSidebarOpen()
		await member.sidebar.expectFileVisible(fileName)

		// member then accepts the invite and joins the workspace.
		await member.goto(inviteUrl)
		await member.editor.ensureSidebarOpen()
		await member.workspaceInviteDialog.acceptInvitation()
		await member.sidebar.expectWorkspaceVisible(workspaceName)

		// Now switching to the home workspace must stay there. The file is owned by a workspace the
		// member belongs to, so it must not be listed in home: before the fix it was, and opening it
		// re-activated the workspace, so the member could never get back to their home.
		await member.sidebar.switchToHomeWorkspace()
		await member.sidebar.expectActiveHomeWorkspace()
		await member.sidebar.expectFileNotVisible(fileName)
	})

	test('published snapshots update only after publishing changes, until unpublished', async ({
		owner,
		visitor,
		scenario,
	}) => {
		await scenario.createPersonalFile(owner, scenario.name('published snapshot file'))

		await owner.shareMenu.open()
		await expect(owner.shareMenu.inviteTabButton).toBeVisible()
		await expect(owner.shareMenu.exportTabButton).toBeVisible()
		await expect(owner.shareMenu.publishTabButton).toBeVisible()
		await expect(owner.shareMenu.inviteTabPage).toBeVisible()
		await expect(owner.page.getByTestId('shared-link-shared-switch')).toBeVisible()
		await owner.page.keyboard.press('Escape')

		const publishedUrl = await scenario.publishFile(owner)
		expect(new URL(publishedUrl).pathname).toMatch(/^\/p\//)

		await visitor.goto(publishedUrl)
		await visitor.editor.expectShapesCount(0)

		await scenario.createRectangle(owner)
		await owner.editor.expectShapesCount(1)

		await visitor.page.reload()
		await visitor.waitForAppReady()
		await visitor.editor.expectShapesCount(0)

		await scenario.publishChanges(owner)
		await scenario.expectPublishedShapesCount(visitor, 1)

		await owner.shareMenu.open()
		await owner.shareMenu.unpublishFile()
		await owner.page.keyboard.press('Escape')
		await scenario.expectUnpublished(visitor, publishedUrl)
	})

	test('workspace invites, settings, roles, and deletions reach active members without reload', async ({
		owner,
		member,
		scenario,
	}) => {
		test.setTimeout(120_000)
		const { workspaceName, fileName, inviteUrl, memberUserId } =
			await scenario.createPendingWorkspaceInvite({
				owner,
				member,
				workspaceName: scenario.name('live workspace'),
				fileName: scenario.name('live workspace file'),
			})
		const ownerDialog = owner.page.getByRole('dialog', { name: 'Manage workspace' })
		const memberRoleSelect = ownerDialog.locator(`[id="workspace-member-role-${memberUserId}"]`)

		await owner.sidebar.openWorkspaceSettings(workspaceName)
		await expect(memberRoleSelect).not.toBeVisible()

		await member.goto(inviteUrl)
		await member.editor.ensureSidebarOpen()
		await member.workspaceInviteDialog.expectIsVisible()
		await member.workspaceInviteDialog.acceptInvitation()
		await member.sidebar.expectWorkspaceVisible(workspaceName)
		await member.sidebar.switchToWorkspace(workspaceName)
		await member.sidebar.expectFileVisible(fileName)

		// Owners see the full dialog surface, and the new member joins the roster live.
		await expect(memberRoleSelect).toHaveText('Member', { timeout: 10000 })
		await expect(ownerDialog.getByPlaceholder('Workspace name')).toBeVisible()
		await expect(ownerDialog.getByText('Invite teammates')).toBeVisible()
		await expect(ownerDialog.getByRole('button', { name: 'Copy invite link' })).toBeVisible()
		await expect(ownerDialog.getByRole('tab', { name: 'Members' })).toBeVisible()
		await expect(ownerDialog.getByText(/\(you\)/)).toBeVisible()

		// Interacting with the portalled role select should not count as a background click.
		await selectTlaMenuOption(owner.page, memberRoleSelect, 'Member')
		await expect(ownerDialog).toBeVisible()

		// The dialog exposes the invite link only through the Copy button (no visible URL
		// field), so read it from the clipboard. Regenerating from the Settings tab
		// replaces the link, so a later copy returns a different URL.
		await ownerDialog.getByRole('button', { name: 'Copy invite link' }).click()
		const firstInviteUrl = await owner.page.evaluate(() => navigator.clipboard.readText())
		expect(new URL(firstInviteUrl).pathname).toMatch(/^\/invite\//)

		await ownerDialog.getByRole('tab', { name: 'Settings' }).click()
		await ownerDialog.getByRole('button', { name: 'Regenerate invite link' }).click()
		await owner.page.getByRole('button', { name: 'Regenerate', exact: true }).click()

		// Copy again (after the 1s copy-button guard) and poll until the new link lands.
		await expect
			.poll(
				async () => {
					await owner.page.waitForTimeout(1100)
					await ownerDialog.getByRole('button', { name: 'Copy invite link' }).click()
					return owner.page.evaluate(() => navigator.clipboard.readText())
				},
				{ timeout: 15000 }
			)
			.not.toBe(firstInviteUrl)
		const regeneratedInviteUrl = await owner.page.evaluate(() => navigator.clipboard.readText())
		expect(new URL(regeneratedInviteUrl).pathname).toMatch(/^\/invite\//)
		await owner.page.keyboard.press('Escape')

		// Non-owners can inspect settings but cannot access owner-only controls.
		await member.sidebar.openWorkspaceSettings(workspaceName)
		const memberDialog = member.page.getByRole('dialog', { name: 'Manage workspace' })
		await expect(memberDialog.getByPlaceholder('Workspace name')).toBeDisabled()
		await expect(
			memberDialog.locator(`[id="workspace-member-role-${memberUserId}"]`)
		).not.toBeVisible()

		// Leave/Delete live on the Settings tab; members get Leave but not Delete.
		await memberDialog.getByRole('tab', { name: 'Settings' }).click()
		const deleteWorkspaceButton = memberDialog.getByRole('button', { name: /Delete workspace/ })
		await expect(deleteWorkspaceButton).not.toBeVisible()
		await expect(memberDialog.getByRole('button', { name: /Leave workspace/ })).toBeVisible()
		await member.page.keyboard.press('Escape')

		// Deletions are observed by a regular member, before any role change.
		await owner.sidebar.switchToWorkspace(workspaceName)
		await owner.sidebar.deleteFileByName(fileName)
		await owner.deleteFileDialog.expectIsVisible()
		await owner.deleteFileDialog.confirmDeletion()
		await owner.deleteFileDialog.expectIsNotVisible()
		await owner.sidebar.expectFileNotVisible(fileName)
		await member.sidebar.expectFileNotVisible(fileName)

		// Promoting surfaces Delete reactively, and demoting takes it away again.
		await member.sidebar.openWorkspaceSettings(workspaceName)
		await memberDialog.getByRole('tab', { name: 'Settings' }).click()
		await expect(deleteWorkspaceButton).not.toBeVisible()
		await scenario.setWorkspaceMemberRole({ owner, workspaceName, memberUserId, role: 'owner' })
		await expect(deleteWorkspaceButton).toBeVisible({ timeout: 10000 })
		await scenario.setWorkspaceMemberRole({ owner, workspaceName, memberUserId, role: 'member' })
		await expect(deleteWorkspaceButton).not.toBeVisible({ timeout: 10000 })
		await member.page.keyboard.press('Escape')

		await owner.sidebar.deleteWorkspace(workspaceName)
		await owner.sidebar.expectWorkspaceNotVisible(workspaceName)
		await member.sidebar.expectWorkspaceNotVisible(workspaceName)
	})

	test('removed and leaving members lose the workspace without reload', async ({
		owner,
		member,
		scenario,
	}) => {
		test.setTimeout(90_000)
		const { workspaceName, fileName, inviteUrl } = await scenario.createWorkspaceWithRemovedMember({
			owner,
			member,
			workspaceName: scenario.name('member removal workspace'),
			fileName: scenario.name('member removal file'),
		})

		await member.sidebar.expectWorkspaceNotVisible(workspaceName)
		await member.sidebar.expectFileNotVisible(fileName)

		// Removal doesn't burn the invite, so the member can rejoin and then leave on their own.
		await member.goto(inviteUrl)
		await member.editor.ensureSidebarOpen()
		await member.workspaceInviteDialog.acceptInvitation()
		await member.sidebar.expectWorkspaceVisible(workspaceName)
		await member.sidebar.switchToWorkspace(workspaceName)
		await member.sidebar.expectFileVisible(fileName)
		await member.sidebar.openWorkspaceSettings(workspaceName)
		const memberDialog = member.page.getByRole('dialog', { name: 'Manage workspace' })
		await memberDialog.getByRole('tab', { name: 'Settings' }).click()

		// Leaving requires confirmation (the confirm button is just "Leave") and removes access.
		await memberDialog.getByRole('button', { name: /Leave workspace/ }).click()
		await member.page.getByRole('button', { name: 'Leave', exact: true }).click()
		await member.sidebar.expectWorkspaceNotVisible(workspaceName)
		await member.sidebar.expectFileNotVisible(fileName)
	})
})
