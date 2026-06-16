import type { Locator, Page } from '@playwright/test'
import { expect, step } from './tla-test'

// Cross-client Zero sync (accepting an invite, being removed, a workspace being deleted) delivers
// workspace-membership rows asynchronously and with variable latency on a busy CI machine. This is
// the budget for the data-layer wait that actually gates on that sync; it is intentionally generous
// while still bounded, so a genuine sync regression fails with a clear signal rather than hanging.
const WORKSPACE_MEMBERSHIP_SYNC_TIMEOUT = 30_000

export class Sidebar {
	public readonly fileLink = '[data-element="file-link"]'

	public readonly sidebarLayout: Locator
	public readonly sidebar: Locator
	public readonly sidebarLogo: Locator
	public readonly createFileButton: Locator
	public readonly createWorkspaceButton: Locator
	public readonly userSettingsMenu: Locator
	public readonly helpMenu: Locator
	public readonly themeButton: Locator
	public readonly darkModeButton: Locator
	public readonly signOutButton: Locator
	constructor(public readonly page: Page) {
		this.sidebarLayout = this.page.getByTestId('tla-sidebar-layout')
		this.sidebar = this.page.getByTestId('tla-sidebar')
		this.sidebarLogo = this.page.getByTestId('tla-sidebar-logo-icon')
		this.createFileButton = this.page.getByTestId('tla-create-file')
		this.createWorkspaceButton = this.page.getByTestId('tla-create-workspace')
		this.userSettingsMenu = this.page.getByTestId('tla-sidebar-user-settings-trigger')
		this.helpMenu = this.userSettingsMenu
		this.themeButton = this.page.getByTestId('dialog-sub.theme-button')
		this.darkModeButton = this.page.getByRole('menuitemcheckbox', { name: 'Dark', exact: true })
		this.signOutButton = this.page.getByTestId('dialog.sign-out')
	}

	async isVisible() {
		return this.sidebarLogo.isVisible()
	}

	async expectIsVisible() {
		await expect(this.sidebarLogo).toBeInViewport()
	}

	async expectIsNotVisible() {
		await expect(this.sidebarLogo).not.toBeInViewport()
	}

	async createNewDocument(name?: string) {
		const numDocuments = await this.getNumberOfFiles()
		const previousUrl = this.page.url()
		await this.createFileButton.click()
		const input = this.page.getByTestId('tla-sidebar-rename-input')
		await expect(input).toBeVisible()
		await expect(input).toBeFocused()
		if (name) {
			await input.fill(name)
		}
		await Promise.all([
			this.page.waitForURL(
				(url) => url.toString() !== previousUrl && url.pathname.startsWith('/f/'),
				{ timeout: 10000 }
			),
			this.page.keyboard.press('Enter'),
		])
		await expect.poll(() => this.getNumberOfFiles()).toBe(numDocuments + 1)
		// give the websocket a chance to catch up
		await this.mutationResolution()
		// the create button has a 1000ms throttle - wait so the next creation isn't swallowed
		await this.page.waitForTimeout(1100)
	}

	async getNumberOfFiles() {
		return (await this.page.$$(this.fileLink)).length
	}

	async openUserSettingsMenu() {
		await this.userSettingsMenu.hover()
		await this.userSettingsMenu.click()
		// Wait for the dropdown content to mount before child-item clicks race the open animation.
		await expect(this.page.getByRole('menu')).toBeVisible()
	}

	@step
	async setDarkMode() {
		await this.openUserSettingsMenu()
		await this.themeButton.hover()
		await this.darkModeButton.click()
		await this.mutationResolution()
	}

	@step
	async openLanguageMenu(languageButtonText: string) {
		// need the editor to be mounted for the menu to be available
		await expect(this.page.getByTestId('canvas')).toBeVisible()
		await this.openUserSettingsMenu()
		await this.page.getByText(languageButtonText).hover()
	}

	@step
	async expectLanguageToBe(languageButtonText: string, language: string) {
		await this.openLanguageMenu(languageButtonText)
		await expect(async () => {
			const checkedAttribute = await this.page
				.getByRole('menuitemcheckbox', { name: language })
				.getAttribute('data-state')
			expect(checkedAttribute).toBe('checked')
		}).toPass()
	}

	@step
	async setLanguage(languageButtonText: string, language: string) {
		await this.openLanguageMenu(languageButtonText)
		await this.page.getByRole('menuitemcheckbox', { name: language }).click()
		await this.page.keyboard.press('Escape')
		await this.mutationResolution()
	}

	@step
	async signOut() {
		await this.openUserSettingsMenu()
		await this.signOutButton.click()
	}

	async expectToContainText(text: string) {
		await expect(this.sidebarLayout).toContainText(text)
	}

	async expectNotToContainText(text: string) {
		await expect(this.sidebarLayout).not.toContainText(text)
	}

	private getTestId(section: string, index: number, suffix?: string) {
		return `tla-file-link-${section}-${index}${suffix ? `-${suffix}` : ''}`
	}

	getFirstFileLink() {
		return this.getFileLink('today', 0)
	}

	getFileLink(section: string, index: number) {
		return this.page.getByTestId(this.getTestId(section, index))
	}

	async getFirstFileName() {
		return await this.getFileName(0)
	}

	async getFileName(index: number) {
		return await this.page
			.getByTestId(this.getTestId('today', index, 'name'))
			.innerText({ timeout: 5000 })
	}

	@step
	private async openFileMenu(fileLink: Locator) {
		await fileLink?.hover()
		const button = fileLink.getByRole('button')
		await button?.click()
	}

	@step
	async deleteFile(index: number) {
		await this.openFileMenu(this.getFileLink('today', index))
		await this.deleteFromFileMenu()
	}

	@step
	private async deleteFromFileMenu() {
		await this.page.getByRole('menuitem', { name: 'Delete' }).click()
		await this.mutationResolution()
	}

	@step
	async renameFile(index: number, newName: string) {
		const fileLink = this.getFileLink('today', index)
		await this.openFileMenu(fileLink)
		await this.renameFromFileMenu(newName)
		await this.mutationResolution()
	}

	@step
	async renameFileByName(fileName: string, newName: string) {
		await this.openFileMenuByName(fileName)
		await this.renameFromFileMenu(newName)
		await this.mutationResolution()
	}

	async mutationResolution() {
		await expect(async () => {
			await this.page.evaluate(async () => {
				await (window as any).app?.z?.__e2e__waitForMutationResolution?.()
			})
		}).toPass()
	}

	@step
	async renameFromFileMenu(name: string) {
		await this.page.getByRole('menuitem', { name: 'Rename' }).click()
		const input = this.page.getByRole('textbox')
		await input.fill(name)
		await this.page.keyboard.press('Enter')
		await this.mutationResolution()
	}

	@step
	private async duplicateFromFileMenu(name?: string) {
		await this.page.getByRole('menuitem', { name: 'Duplicate' }).click()
		const input = this.page.getByTestId('tla-sidebar-rename-input')
		await expect(input).toBeVisible()
		await expect(input).toBeFocused()
		if (name) {
			await input.fill(name)
		}
		await this.page.keyboard.press('Enter')
		await this.mutationResolution()
	}

	@step
	async pinFromFileMenu(index: number) {
		const fileLink = this.getFileLink('today', index)
		await this.openFileMenu(fileLink)
		await this.page.getByRole('menuitem', { name: 'Pin' }).click()
		await this.mutationResolution()
	}

	@step
	async unpinFromFileMenu(index: number) {
		const fileLink = this.getFileLink('pinned', index)
		await this.openFileMenu(fileLink)
		await this.page.getByRole('menuitem', { name: 'Unpin' }).click()
		await this.mutationResolution()
	}

	@step
	async duplicateFile(index: number, name?: string) {
		const fileLink = this.getFileLink('today', index)
		await this.openFileMenu(fileLink)
		await this.duplicateFromFileMenu(name)
		await this.mutationResolution()
	}

	@step
	async copyFileLinkFromFileMenu() {
		await this.page.getByRole('menuitem', { name: 'Copy link' }).click()
	}

	// The app writes to the clipboard asynchronously after the copy action, so reading it once can
	// return a stale or empty value. Poll until the clipboard holds a valid URL (optionally matching
	// an expected path) to avoid races.
	private async readClipboardUrl(pathPattern?: RegExp): Promise<string> {
		let value = ''
		await expect(async () => {
			value = await this.page.evaluate(() => navigator.clipboard.readText())
			const url = new URL(value)
			if (pathPattern) expect(url.pathname).toMatch(pathPattern)
		}).toPass({ timeout: 10000 })
		return value
	}

	@step
	async copyFileLink(index: number) {
		const fileLink = this.getFileLink('today', index)
		await this.openFileMenu(fileLink)
		await this.copyFileLinkFromFileMenu()
		return await this.readClipboardUrl(/^\/f\//)
	}

	@step
	async copyFileLinkByName(name: string): Promise<string> {
		const fileLink = this.getFileByName(name)
		await this.openFileMenu(fileLink)
		await this.copyFileLinkFromFileMenu()
		return await this.readClipboardUrl(/^\/f\//)
	}

	async getAfterElementStyle(element: Locator, property: string): Promise<string> {
		return element.evaluate((el, property) => {
			return window.getComputedStyle(el, '::after').getPropertyValue(property)
		}, property)
	}

	async isHinted(fileLink: Locator): Promise<boolean> {
		const backgroundColor = await this.getAfterElementStyle(fileLink, 'background-color')
		return backgroundColor === 'rgba(9, 11, 12, 0.043)'
	}

	@step
	async closeAccountMenu() {
		await this.page.keyboard.press('Escape')
	}

	// Workspace-related methods

	// A single attempt at opening the switcher: click only when it isn't already open, then confirm
	// the menu content mounted (Home is always present). Callers that also act on a menu item should
	// run this *inside* their own retry loop alongside that action — re-renders and navigation that
	// fire while the app settles after a cross-client change can dismiss the menu between opening it
	// and acting, so the open and the action have to be retried together, not in sequence.
	private async ensureWorkspaceSwitcherOpen() {
		const home = this.page.getByTestId('tla-workspace-switcher-home')
		if (!(await home.isVisible())) {
			await this.page.getByTestId('tla-workspace-switcher').click()
		}
		await expect(home).toBeVisible({ timeout: 2000 })
	}

	@step
	async openWorkspaceSwitcher() {
		await expect(() => this.ensureWorkspaceSwitcherOpen()).toPass({ timeout: 15000 })
	}

	@step
	async createWorkspace(name: string) {
		// The standalone button is only shown while the user has no workspaces;
		// after that, creating happens from the workspace switcher dropdown.
		if (await this.createWorkspaceButton.isVisible()) {
			await this.createWorkspaceButton.click()
		} else {
			await this.openWorkspaceSwitcher()
			await this.page.getByTestId('tla-create-workspace-menu-item').click()
		}

		const input = this.page.getByPlaceholder('Workspace name')
		await expect(input).toBeVisible()
		await input.fill(name)

		await this.page.getByRole('button', { name: 'Create workspace' }).click()
		await this.mutationResolution()

		// Creating a workspace switches to it and opens its seeded welcome file. That file
		// arrives named, so (unlike a blank file) there is no inline rename to dismiss.
		await this.expectActiveWorkspace(name)
	}

	getWorkspaceLink(name: string) {
		return this.page.locator('[data-element="workspace-link"]').filter({ hasText: name })
	}

	@step
	async expectWorkspaceVisible(name: string) {
		// Gate on cross-client sync at the data layer first — immune to dropdown churn — then assert
		// the switcher renders the workspace. Re-open and re-check together: the membership can be
		// fully synced (the member may even be active in the workspace) yet the assertion still fails
		// because a settling re-render dismissed the menu, and a closed switcher has no link items.
		await this.waitForWorkspaceMembershipSync(name, true)
		await expect(async () => {
			await this.ensureWorkspaceSwitcherOpen()
			await expect(this.getWorkspaceLink(name)).toBeVisible({ timeout: 2000 })
		}).toPass({ timeout: 20000 })
		await this.page.keyboard.press('Escape')
	}

	@step
	async expectWorkspaceNotVisible(name: string) {
		// Workspace removal (member removed, workspace deleted) reaches an active member via
		// cross-client sync too. Wait for the membership to leave the data layer first, then confirm
		// the switcher no longer lists it. Keep the menu open while checking (Home is always present)
		// so the absence can't pass vacuously against a dropdown that closed under us mid-settle.
		await this.waitForWorkspaceMembershipSync(name, false)
		await expect(async () => {
			await this.ensureWorkspaceSwitcherOpen()
			await expect(this.getWorkspaceLink(name)).toHaveCount(0)
		}).toPass({ timeout: 20000 })
		await this.page.keyboard.press('Escape')
	}

	/**
	 * Poll the app's data layer until a workspace membership with the given name is present (or
	 * absent). The membership backs the workspace switcher reactively via `getWorkspaceMemberships`,
	 * so once it settles the UI follows immediately — this lets callers gate on cross-client sync
	 * without depending on the dropdown being open at the moment the row arrives.
	 */
	private async waitForWorkspaceMembershipSync(name: string, present: boolean) {
		await expect
			.poll(
				() =>
					this.page.evaluate((workspaceName) => {
						const memberships = (window as any).app?.getWorkspaceMemberships?.() ?? []
						return memberships.some((m: any) => m?.group?.name === workspaceName)
					}, name),
				{ timeout: WORKSPACE_MEMBERSHIP_SYNC_TIMEOUT }
			)
			.toBe(present)
	}

	@step
	async expectActiveWorkspace(name: string) {
		// Switching workspaces navigates to (or creates) a file in the target before the active name
		// updates, so allow the suite's cross-client budget rather than the default 5s.
		await expect(this.page.getByTestId('tla-active-workspace-name')).toHaveText(name, {
			timeout: 10000,
		})
	}

	@step
	async switchToWorkspace(name: string) {
		// Re-open and click together: a settling re-render can dismiss the menu between opening it and
		// clicking the workspace, leaving the click waiting on an item that no longer exists.
		await expect(async () => {
			await this.ensureWorkspaceSwitcherOpen()
			await this.getWorkspaceLink(name).click({ timeout: 2000 })
		}).toPass({ timeout: 20000 })
		await this.expectActiveWorkspace(name)
	}

	@step
	async openWorkspaceSettings(name: string) {
		// The settings action lives on the active workspace's row inside the
		// workspace switcher, so switch to the workspace first if needed, then
		// open the switcher to reach it.
		const activeName = await this.page.getByTestId('tla-active-workspace-name').innerText()
		if (activeName !== name) {
			await this.switchToWorkspace(name)
		}
		await this.openWorkspaceSwitcher()
		await this.page.getByTestId('tla-sidebar-workspace-settings').click()
	}

	@step
	async renameWorkspace(oldName: string, newName: string) {
		await this.openWorkspaceSettings(oldName)

		// Find the name input and change it (use placeholder as user sees it)
		const input = this.page.getByPlaceholder('Workspace name')
		await expect(input).toBeVisible()
		await input.fill(newName)

		// Close the dialog
		await this.page.getByRole('button', { name: 'Close' }).click()
		await this.mutationResolution()
	}

	@step
	async deleteWorkspace(name: string) {
		await this.openWorkspaceSettings(name)

		// Click the Delete workspace button (exact text as user sees it)
		await this.page.getByRole('button', { name: 'Delete workspace…' }).click()

		// Confirm deletion in the confirmation dialog
		await this.page.getByRole('button', { name: 'Delete workspace' }).click()
		await this.mutationResolution()
	}

	@step
	async copyWorkspaceInviteLink(name: string): Promise<string> {
		// The invite action lives on the active workspace's row inside the
		// workspace switcher, so switch to the workspace first if needed, then
		// open the switcher to reach it.
		const activeName = await this.page.getByTestId('tla-active-workspace-name').innerText()
		if (activeName !== name) {
			await this.switchToWorkspace(name)
		}
		await this.openWorkspaceSwitcher()
		await this.page.getByTestId('tla-sidebar-invite-teammates').click()
		return await this.readClipboardUrl()
	}

	// File visibility methods
	getFileByName(fileName: string) {
		return this.page.locator('[data-element="file-link"]').filter({ hasText: fileName })
	}

	@step
	async expectFileVisible(fileName: string) {
		// A file can appear in a member's list via cross-client sync (workspace files, shared guest
		// files), so allow the same propagation budget the rest of the suite uses rather than the
		// default 5s assertion timeout.
		await expect(this.getFileByName(fileName)).toBeVisible({ timeout: 10000 })
	}

	@step
	async expectFileNotVisible(fileName: string) {
		// File removal (deletion, losing workspace access) also propagates via cross-client sync.
		await expect(this.getFileByName(fileName)).not.toBeVisible({ timeout: 10000 })
	}

	@step
	private async openFileMenuByName(fileName: string) {
		const fileLink = this.getFileByName(fileName)
		await fileLink.hover()
		const button = fileLink.getByRole('button')
		await button.click()
	}

	@step
	async dragFileToPinnedSection(fileName: string) {
		const fileElement = this.getFileByName(fileName)
		const fileBox = await fileElement.boundingBox()
		const topFile = this.sidebar.locator('[data-drop-target-id^="file:"]').first()
		const topBox = await topFile.boundingBox()

		if (!fileBox || !topBox) throw new Error('Could not get bounding boxes')

		// Move to file
		await this.page.mouse.move(fileBox.x + fileBox.width / 2, fileBox.y + fileBox.height / 2)

		// Press and hold
		await this.page.mouse.down()

		// Small delay to let browser detect drag intent
		await this.page.waitForTimeout(100)

		// Drop just above the top of the file list, inside the pin zone
		await this.page.mouse.move(topBox.x + topBox.width / 2, topBox.y - 5, { steps: 10 })

		// Small delay before release
		await this.page.waitForTimeout(50)

		// Release
		await this.page.mouse.up()

		await this.mutationResolution()
	}

	@step
	async dragFileToUnpinnedSection(fileName: string) {
		const fileElement = this.getFileByName(fileName)
		const fileBox = await fileElement.boundingBox()
		const lastFile = this.sidebar.locator('[data-drop-target-id^="file:"]').last()
		const lastBox = await lastFile.boundingBox()

		if (!fileBox || !lastBox) throw new Error('Could not get bounding boxes')

		// Move to file
		await this.page.mouse.move(fileBox.x + fileBox.width / 2, fileBox.y + fileBox.height / 2)

		// Press and hold
		await this.page.mouse.down()

		// Small delay to let browser detect drag intent
		await this.page.waitForTimeout(100)

		// Drop on the unpinned part of the list, below the pin zone
		await this.page.mouse.move(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height / 2, {
			steps: 10,
		})

		// Small delay before release
		await this.page.waitForTimeout(50)

		// Release
		await this.page.mouse.up()

		await this.mutationResolution()
	}

	@step
	async pinFile(fileName: string) {
		await this.openFileMenuByName(fileName)
		await this.page.getByRole('menuitem', { name: 'Pin' }).click()
		await this.mutationResolution()
	}

	@step
	async unpinFile(fileName: string) {
		await this.openFileMenuByName(fileName)
		await this.page.getByRole('menuitem', { name: 'Unpin' }).click()
		await this.mutationResolution()
	}

	@step
	async expectFilePinned(fileName: string) {
		const fileLink = this.getFileByName(fileName)
		await expect(fileLink).toHaveAttribute('data-is-pinned', 'true')
	}

	@step
	async expectFileNotPinned(fileName: string) {
		const fileLink = this.getFileByName(fileName)
		await expect(fileLink).toHaveAttribute('data-is-pinned', 'false')
	}

	@step
	async expectFileActive(fileName: string) {
		const fileLink = this.getFileByName(fileName)
		await expect(fileLink).toHaveAttribute('data-active', 'true')
	}

	@step
	async expectFileNotActive(fileName: string) {
		const fileLink = this.getFileByName(fileName)
		await expect(fileLink).toHaveAttribute('data-active', 'false')
	}

	/** The names of the files currently shown in the file list (the active workspace's files). */
	async getVisibleFiles(): Promise<string[]> {
		const fileLinks = this.sidebar.locator('[data-element="file-link"]')
		const count = await fileLinks.count()
		const fileNames: string[] = []
		for (let i = 0; i < count; i++) {
			const fileName = await fileLinks.nth(i).locator('[data-testid*="-name"]').innerText()
			fileNames.push(fileName)
		}
		return fileNames
	}

	@step
	async deleteFileByName(fileName: string) {
		await this.openFileMenuByName(fileName)
		await this.deleteFromFileMenu()
	}

	@step
	async duplicateFileByName(fileName: string, newName?: string) {
		await this.openFileMenuByName(fileName)
		await this.duplicateFromFileMenu(newName)
	}

	@step
	async openMoveToMenu(fileName: string) {
		await this.openFileMenuByName(fileName)
		const moveToButton = this.page.getByTestId('dialog-sub.move-to-workspace-button')
		await expect(async () => {
			await expect(moveToButton).toBeVisible()
			await moveToButton.hover({ force: true })
			await expect(this.page.getByTestId('dialog-sub.move-to-workspace-content')).toBeVisible({
				timeout: 1000,
			})
		}).toPass()
	}

	@step
	async closeMoveToMenu() {
		await this.page.keyboard.press('Escape')
		await this.page.keyboard.press('Escape')
	}

	@step
	async moveFileToWorkspace(fileName: string, targetWorkspaceName: string) {
		await this.openMoveToMenu(fileName)
		await this.page.getByRole('menuitem', { name: targetWorkspaceName, exact: true }).click()
		await this.mutationResolution()
	}

	@step
	async moveFileToHome(fileName: string) {
		await this.moveFileToWorkspace(fileName, 'My files')
	}
}
