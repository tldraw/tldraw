import { OTHER_USERS } from '../../consts'
import { getRandomName, openNewTab } from '../../fixtures/helpers'
import { SignInDialog } from '../../fixtures/SignInDialog'
import { expect, test } from '../../fixtures/tla-test'

// The sidebar has a workspace switcher dropdown at the top (home workspace + the
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
		test('a workspace can be created from the switcher dropdown', async ({ page, sidebar }) => {
			const workspaceName = getRandomName()
			await sidebar.createWorkspace(workspaceName)

			// creating remains available from the workspace switcher dropdown
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
			// route) rewrites the URL with a `?d=` param once its editor mounts. As the
			// incoming canvas mounts it steals focus, and that focus shift used to dismiss
			// the just-reopened switcher.
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

			// The switcher must stay open while the incoming canvas finishes loading,
			// rewrites the URL with `?d=`, and steals focus — that focus steal is what
			// used to dismiss it.
			await page.waitForURL(/[?&]d=/, { timeout: 15000 })
			await sidebar.expectActiveHomeWorkspace()
			await expect(homeItem).toBeVisible()
		})

		test('dismissing the switcher does not click a file underneath', async ({ page, sidebar }) => {
			const file1 = getRandomName()
			const file2 = getRandomName()
			const file3 = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createNewDocument(file2)
			await sidebar.createNewDocument(file3)
			await sidebar.expectFileActive(file3)

			await sidebar.openWorkspaceSwitcher()
			const overlay = page.getByTestId('tla-workspace-switcher-overlay')
			await expect(overlay).toBeVisible()

			const target = await page.evaluate(() => {
				const overlay = document.querySelector<HTMLElement>(
					'[data-testid="tla-workspace-switcher-overlay"]'
				)
				if (!overlay) throw new Error('Missing workspace switcher overlay')

				const links = Array.from(
					document.querySelectorAll<HTMLElement>('[data-element="file-link"]')
				)
				for (const link of links.reverse()) {
					if (link.dataset.active === 'true') continue

					const rect = link.getBoundingClientRect()
					const x = rect.left + rect.width / 2
					const y = rect.top + rect.height / 2
					if (
						!document
							.elementFromPoint(x, y)
							?.closest('[data-testid="tla-workspace-switcher-overlay"]')
					) {
						continue
					}

					return {
						name: link.querySelector('[data-testid*="-name"]')?.textContent?.trim() ?? '',
						x,
						y,
					}
				}

				throw new Error('Could not find a file link behind the workspace switcher overlay')
			})

			await page.evaluate(({ x, y }) => {
				const overlay = document.querySelector<HTMLElement>(
					'[data-testid="tla-workspace-switcher-overlay"]'
				)
				if (!overlay) throw new Error('Missing workspace switcher overlay')

				overlay.dispatchEvent(
					new PointerEvent('pointerdown', {
						bubbles: true,
						cancelable: true,
						clientX: x,
						clientY: y,
						pointerId: 1,
						pointerType: 'touch',
						isPrimary: true,
					})
				)
			}, target)

			await expect(overlay).toBeVisible()

			await page.evaluate(({ x, y }) => {
				const target = document.elementFromPoint(x, y)
				target?.dispatchEvent(
					new PointerEvent('pointerup', {
						bubbles: true,
						cancelable: true,
						clientX: x,
						clientY: y,
						pointerId: 1,
						pointerType: 'touch',
						isPrimary: true,
					})
				)
				target?.dispatchEvent(
					new MouseEvent('click', {
						bubbles: true,
						cancelable: true,
						clientX: x,
						clientY: y,
					})
				)
			}, target)

			await expect(overlay).toBeHidden()
			await sidebar.expectFileActive(file3)
			await sidebar.expectFileNotActive(target.name)

			await sidebar.openWorkspaceSwitcher()
			await page.getByTestId('tla-workspace-switcher').click()
			await expect(page.getByTestId('tla-workspace-switcher-home')).toBeHidden()
		})

		test('clicking the canvas closes the workspace switcher without reaching the canvas', async ({
			page,
			sidebar,
		}) => {
			const shapeId = await page.evaluate(() => {
				const editor = (window as any).editor
				editor.createShapes([
					{
						type: 'geo',
						x: 100,
						y: 100,
						props: { geo: 'rectangle', w: 100, h: 100 },
					},
				])
				const shape = editor.getCurrentPageShapes()[0]
				editor.select(shape.id)
				return shape.id
			})

			await sidebar.openWorkspaceSwitcher()
			const homeItem = page.getByTestId('tla-workspace-switcher-home')
			await expect(homeItem).toBeVisible()

			await page.mouse.click(600, 300)
			await expect(homeItem).toBeHidden()
			expect(
				await page.evaluate(() => {
					const editor = (window as any).editor
					return editor.getSelectedShapeIds()
				})
			).toEqual([shapeId])
		})

		test('closing the mobile sidebar closes open sidebar menus', async ({ page, sidebar }) => {
			const fileName = getRandomName()
			await sidebar.createNewDocument(fileName)

			await page.setViewportSize({ width: 390, height: 844 })

			const mobileToggle = page.getByTestId('tla-sidebar-toggle-mobile')
			const mobileOverlay = page.getByTestId('tla-sidebar-overlay-mobile')
			const closeMobileSidebar = async () => {
				await mobileOverlay.click({ position: { x: 380, y: 422 } })
				await expect(mobileOverlay).toBeHidden()
			}

			await expect(mobileToggle).toBeVisible()
			await mobileToggle.click()
			await expect(mobileOverlay).toBeVisible()

			await sidebar.openWorkspaceSwitcher()
			await expect(page.getByTestId('tla-workspace-switcher-home')).toBeVisible()

			await closeMobileSidebar()
			await expect(page.getByTestId('tla-workspace-switcher-home')).toBeHidden()

			await mobileToggle.click()
			await expect(mobileOverlay).toBeVisible()

			const fileLink = sidebar.getFileByName(fileName)
			await fileLink.hover()
			await fileLink.getByRole('button').click()
			await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible()

			await closeMobileSidebar()
			await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeHidden()
		})

		test('create file button creates in the active workspace', async ({ sidebar }) => {
			const workspaceName = getRandomName()
			const file1 = getRandomName()
			const file2 = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createNewDocument(homeFileName)

			await sidebar.createWorkspace(workspaceName)
			await sidebar.switchToHomeWorkspace()
			await sidebar.moveFileToWorkspace(file1, workspaceName)

			await sidebar.switchToWorkspace(workspaceName)
			await sidebar.createNewDocument(file2)

			await sidebar.expectActiveWorkspace(workspaceName)
			const filesInWorkspace = await sidebar.getVisibleFiles()
			expect(filesInWorkspace).toContain(file1)
			expect(filesInWorkspace).toContain(file2)

			await sidebar.switchToHomeWorkspace()
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
			await sidebar.switchToHomeWorkspace()
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

		test('move file to Home', async ({ sidebar }) => {
			const workspaceName = getRandomName()
			const file1 = getRandomName()
			const file2 = getRandomName()
			const homeFileName = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createNewDocument(file2)
			await sidebar.createNewDocument(homeFileName)

			await sidebar.createWorkspace(workspaceName)
			await sidebar.switchToHomeWorkspace()
			await sidebar.moveFileToWorkspace(file1, workspaceName)
			await sidebar.moveFileToWorkspace(file2, workspaceName)

			await sidebar.switchToWorkspace(workspaceName)
			// make sure the file we move is not the active one
			await sidebar.getFileByName(file2).click()
			await sidebar.expectFileActive(file2)

			await sidebar.moveFileToHome(file1)
			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileVisible(file2)

			await sidebar.switchToHomeWorkspace()
			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(homeFileName)
		})

		test('move to menu is a checklist of every workspace', async ({ page, sidebar }) => {
			const workspace1 = getRandomName()
			const workspace2 = getRandomName()
			const file1 = getRandomName()

			await sidebar.createNewDocument(file1)
			await sidebar.createWorkspace(workspace1)
			await sidebar.createWorkspace(workspace2)
			await sidebar.switchToHomeWorkspace()
			const homeWorkspaceName = await sidebar.getHomeWorkspaceName()

			// In Home: the file lives in the home workspace, which is checked; every other
			// workspace is offered unchecked (an unchecked item's accessible name is
			// just its label, so exact matching works for those).
			await sidebar.openMoveToMenu(file1)
			await expect(
				page.getByRole('menuitemcheckbox', { name: homeWorkspaceName, checked: true })
			).toBeVisible()
			await expect(
				page.getByRole('menuitemcheckbox', { name: workspace1, exact: true })
			).toBeVisible()
			await expect(
				page.getByRole('menuitemcheckbox', { name: workspace2, exact: true })
			).toBeVisible()
			await sidebar.closeMoveToMenu()

			await sidebar.moveFileToWorkspace(file1, workspace1)

			// In workspace1: workspace1 is now the checked item; the home workspace and the
			// other workspace are offered unchecked.
			await sidebar.switchToWorkspace(workspace1)
			await sidebar.openMoveToMenu(file1)
			await expect(
				page.getByRole('menuitemcheckbox', { name: workspace1, checked: true })
			).toBeVisible()
			await expect(
				page.getByRole('menuitemcheckbox', { name: homeWorkspaceName, exact: true })
			).toBeVisible()
			await expect(
				page.getByRole('menuitemcheckbox', { name: workspace2, exact: true })
			).toBeVisible()
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

		test('dragging a pinned file does not unpin it', async ({ sidebar }) => {
			const workspaceName = getRandomName()
			const file1 = getRandomName()

			await sidebar.createWorkspace(workspaceName)
			await sidebar.createNewDocument(file1)

			// Pinning happens through the file menu.
			await sidebar.pinFile(file1)
			await sidebar.expectFilePinned(file1)

			// Dragging a file is now just native link dragging, so dragging a
			// pinned file out of the pinned section no longer unpins it.
			await sidebar.dragFileToUnpinnedSection(file1)
			await sidebar.expectFilePinned(file1)
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
			await sidebar.switchToHomeWorkspace()
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

			// We should land on the workspace's remaining file, not jump to the home workspace.
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
			await sidebar.switchToHomeWorkspace()
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

		test('signing in through the invite dialog completes the workspace join', async ({
			sidebar,
			browser,
			database,
		}) => {
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
			const { newPage, newSidebar, newEditor, newWorkspaceInviteDialog, newContext } =
				await openNewTab(browser, {
					url: inviteUrl,
					allowClipboard: true,
					userProps: undefined,
				})

			// Signed out, the invite link shows the sign-in dialog naming the
			// workspace. Sign in through it: the invite token survives the dialog, so
			// the signed-in invite flow picks it up and offers the join afterwards.
			await expect(newPage.locator('strong', { hasText: workspaceName })).toBeVisible()
			const signInDialog = new SignInDialog(newPage)
			await signInDialog.continueWithEmail(OTHER_USERS[parallelIndex])
			await signInDialog.expectCodeStageVisible()
			await signInDialog.fillCode('424242')

			await newEditor.isLoaded()
			await newEditor.ensureSidebarOpen()
			await newWorkspaceInviteDialog.acceptInvitation()

			await newSidebar.expectWorkspaceVisible(workspaceName)
			await newSidebar.expectFileVisible(fileName)

			await newContext.close()
		})
	})
})
