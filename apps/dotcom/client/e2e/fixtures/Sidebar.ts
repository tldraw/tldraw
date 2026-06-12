import type { Locator, Page } from '@playwright/test'
import { expect, step } from './tla-test'

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
		this.helpMenu = this.page.getByTestId('tla-sidebar-help-menu-trigger')
		this.themeButton = this.page.getByTestId('dialog-sub.help menu color-scheme-button')
		this.darkModeButton = this.page.getByText('Dark')
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
		await this.createFileButton.click()
		const input = this.page.getByTestId('tla-sidebar-rename-input')
		await expect(input).toBeVisible()
		await expect(input).toBeFocused()
		if (name) {
			await input.fill(name)
		}
		await this.page.keyboard.press('Enter')
		const newNumDocuments = await this.getNumberOfFiles()
		expect(newNumDocuments).toBe(numDocuments + 1)
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

	async mutationResolution() {
		await this.page.evaluate(() => (window as any).app.z.__e2e__waitForMutationResolution?.())
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

	@step
	async copyFileLink(index: number) {
		const fileLink = this.getFileLink('today', index)
		await this.openFileMenu(fileLink)
		await this.copyFileLinkFromFileMenu()
		return await this.page.evaluate(() => navigator.clipboard.readText())
	}

	@step
	async copyFileLinkByName(name: string): Promise<string> {
		const fileLink = this.getFileByName(name)
		await this.openFileMenu(fileLink)
		await this.copyFileLinkFromFileMenu()
		return await this.page.evaluate(() => navigator.clipboard.readText())
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

	@step
	async createWorkspace(name: string) {
		await this.createWorkspaceButton.click()

		const input = this.page.getByPlaceholder('Workspace name')
		await expect(input).toBeVisible()
		await input.fill(name)

		await this.page.getByRole('button', { name: 'Create workspace' }).click()
		await this.mutationResolution()
	}

	getWorkspaceLink(name: string) {
		return this.page.locator('[data-element="workspace-link"]').filter({ hasText: name })
	}

	async expectWorkspaceVisible(name: string) {
		await expect(this.getWorkspaceLink(name)).toBeVisible()
	}

	async expectWorkspaceNotVisible(name: string) {
		await expect(this.getWorkspaceLink(name)).not.toBeVisible()
	}

	@step
	async expectActiveWorkspace(name: string) {
		await expect(this.page.getByTestId('tla-active-workspace-name')).toHaveText(name)
	}

	@step
	async switchToWorkspace(name: string) {
		await this.getWorkspaceLink(name).click()
		await this.expectActiveWorkspace(name)
	}

	@step
	private async openWorkspaceMenu(name: string) {
		const link = this.getWorkspaceLink(name)
		await link.hover()
		await link.locator('button[aria-label="More options"]').click()
	}

	@step
	async openWorkspaceSettings(name: string) {
		await this.openWorkspaceMenu(name)
		await this.page.getByRole('menuitem', { name: 'Settings' }).click()
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
	async copyWorkspaceInviteLinkFromMenu(name: string): Promise<string> {
		await this.openWorkspaceMenu(name)
		await this.page.getByRole('menuitem', { name: 'Copy invite link' }).click()
		return await this.page.evaluate(() => navigator.clipboard.readText())
	}

	// File visibility methods
	getFileByName(fileName: string) {
		return this.page.locator('[data-element="file-link"]').filter({ hasText: fileName })
	}

	@step
	async expectFileVisible(fileName: string) {
		await expect(this.getFileByName(fileName)).toBeVisible()
	}

	@step
	async expectFileNotVisible(fileName: string) {
		await expect(this.getFileByName(fileName)).not.toBeVisible()
	}

	@step
	private async openFileMenuByName(fileName: string) {
		const fileLink = this.getFileByName(fileName)
		await fileLink.hover()
		const button = fileLink.getByRole('button')
		await button.click()
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
		await this.page.getByRole('menuitem', { name: 'Move to' }).hover()
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

	@step
	async dragFileToWorkspace(fileName: string, targetWorkspaceName: string) {
		const fileElement = this.getFileByName(fileName)
		const targetWorkspace = this.getWorkspaceLink(targetWorkspaceName)

		const fileBox = await fileElement.boundingBox()
		const targetBox = await targetWorkspace.boundingBox()

		if (!fileBox || !targetBox) throw new Error('Could not get bounding boxes')

		// Move to file
		await this.page.mouse.move(fileBox.x + fileBox.width / 2, fileBox.y + fileBox.height / 2)

		// Press and hold
		await this.page.mouse.down()

		// Small delay to let browser detect drag intent
		await this.page.waitForTimeout(100)

		// Drag to the workspace link in the top list
		await this.page.mouse.move(
			targetBox.x + targetBox.width / 2,
			targetBox.y + targetBox.height / 2,
			{
				steps: 10,
			}
		)

		// Small delay before release
		await this.page.waitForTimeout(50)

		// Release
		await this.page.mouse.up()

		await this.mutationResolution()
	}
}
