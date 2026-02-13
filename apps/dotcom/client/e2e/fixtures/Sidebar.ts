import type { Locator, Page } from '@playwright/test'
import { expect, step } from './tla-test'

export class Sidebar {
	public readonly fileLink = '[data-element="file-link"]'

	public readonly sidebarLayout: Locator
	public readonly sidebar: Locator
	public readonly sidebarLogo: Locator
	public readonly createFileButton: Locator
	public readonly createGroupButton: Locator
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
		this.createGroupButton = this.page.getByTestId('tla-create-group')
		this.userSettingsMenu = this.page.getByTestId('tla-sidebar-user-settings-trigger')
		this.helpMenu = this.page.getByTestId('tla-sidebar-help-menu-trigger')
		this.themeButton = this.page.getByText('Theme')
		this.darkModeButton = this.page.getByText('Dark')
		this.signOutButton = this.page.getByText('Sign out')
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
	}

	async getNumberOfFiles() {
		return (await this.page.$$(this.fileLink)).length
	}

	async openUserSettingsMenu() {
		await this.userSettingsMenu.hover()
		await this.userSettingsMenu.click()
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

	// Group-related methods

	@step
	async createGroup(name: string) {
		// Click the create group button
		await this.createGroupButton.click()

		// Fill in group name
		const input = this.page.getByPlaceholder('Group name')
		await expect(input).toBeVisible()
		await input.fill(name)

		// Click create button
		await this.page.getByRole('button', { name: 'Create group' }).click()
		await this.mutationResolution()
	}

	getGroup(groupName: string) {
		return this.page.locator(`[data-group-id]`).filter({ hasText: groupName })
	}

	async expectGroupVisible(groupName: string) {
		await expect(this.getGroup(groupName)).toBeVisible()
	}

	async isGroupExpanded(groupName: string): Promise<boolean> {
		const group = this.getGroup(groupName)
		const header = group.locator('[role="button"]').first()
		const expanded = await header.getAttribute('aria-expanded')
		return expanded === 'true'
	}

	@step
	async toggleGroup(groupName: string) {
		const group = this.getGroup(groupName)
		const header = group.locator('[role="button"]').first()
		await header.click()
	}

	@step
	async expandGroup(groupName: string) {
		if (!(await this.isGroupExpanded(groupName))) {
			await this.toggleGroup(groupName)
		}
	}

	@step
	async collapseGroup(groupName: string) {
		if (await this.isGroupExpanded(groupName)) {
			await this.toggleGroup(groupName)
		}
	}

	private async expectGroupState(groupName: string, expectedExpanded: boolean) {
		const group = this.getGroup(groupName)
		const header = group.locator('[role="button"]').first()

		// Check aria-expanded attribute
		await expect(header).toHaveAttribute('aria-expanded', expectedExpanded.toString())

		// Check icon via mask style
		const icon = group.locator('[role="img"]').first()
		const expectedIcon = expectedExpanded ? 'icon-folder-open' : 'icon-folder'
		await expect(icon).toBeVisible()

		await expect(async () => {
			const maskStyle = await icon.evaluate((el) => window.getComputedStyle(el).mask)
			expect(maskStyle).toContain(expectedIcon)
			if (!expectedExpanded) {
				expect(maskStyle).not.toContain('icon-folder-open')
			}
		}).toPass({ timeout: 5000 })
	}

	@step
	async expectGroupExpanded(groupName: string) {
		await this.expectGroupState(groupName, true)
	}

	@step
	async expectGroupCollapsed(groupName: string) {
		await this.expectGroupState(groupName, false)
	}

	@step
	async openGroupSettings(groupName: string) {
		const group = this.getGroup(groupName)
		const groupHeader = group.locator('[role="button"]').first()
		await groupHeader.hover()

		// Click the more options button
		const moreOptionsButton = group.locator('button[title="More options"]')
		await moreOptionsButton.click()

		// Click Settings menu item
		await this.page.getByRole('menuitem', { name: 'Settings' }).click()
	}

	@step
	async renameGroup(oldName: string, newName: string) {
		await this.openGroupSettings(oldName)

		// Find the name input and change it (use placeholder as user sees it)
		const input = this.page.getByPlaceholder('Group name')
		await expect(input).toBeVisible()
		await input.fill(newName)

		// Close the dialog
		await this.page.getByRole('button', { name: 'Close' }).click()
		await this.mutationResolution()
	}

	@step
	async deleteGroup(groupName: string) {
		await this.openGroupSettings(groupName)

		// Click the Delete group button (exact text as user sees it)
		await this.page.getByRole('button', { name: 'Delete group…' }).click()

		// Confirm deletion in the confirmation dialog
		await this.page.getByRole('button', { name: 'Delete group' }).click()
		await this.mutationResolution()
	}

	async expectGroupNotVisible(groupName: string) {
		await expect(this.getGroup(groupName)).not.toBeVisible()
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
	async createFileInGroup(groupName: string, fileName: string) {
		const group = this.getGroup(groupName)
		const groupHeader = group.locator('[role="button"]').first()
		await groupHeader.hover()

		const createButton = group.locator('button[title="New file"]')
		await expect(createButton).toBeVisible()
		await createButton.click()

		const input = this.page.getByTestId('tla-sidebar-rename-input')
		await expect(input).toBeVisible({ timeout: 10000 })
		await expect(input).toBeFocused()
		await input.fill(fileName)
		await this.page.keyboard.press('Enter')

		await this.mutationResolution()
		await this.expectFileVisible(fileName)
		// UI has 1000ms throttle - wait to allow next file creation
		await this.page.waitForTimeout(1100)
	}

	@step
	private async openFileMenuByName(fileName: string) {
		const fileLink = this.getFileByName(fileName)
		await fileLink.hover()
		const button = fileLink.getByRole('button')
		await button.click()
	}

	@step
	async pinFileInGroup(fileName: string) {
		await this.openFileMenuByName(fileName)
		await this.page.getByRole('menuitem', { name: 'Pin' }).click()
		await this.mutationResolution()
	}

	@step
	async unpinFileInGroup(fileName: string) {
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

	async getFilesInGroup(groupName: string): Promise<string[]> {
		const group = this.getGroup(groupName)
		const fileLinks = group.locator('[data-element="file-link"]')
		const count = await fileLinks.count()
		const fileNames: string[] = []
		for (let i = 0; i < count; i++) {
			const fileName = await fileLinks.nth(i).locator('[data-testid*="-name"]').innerText()
			fileNames.push(fileName)
		}
		return fileNames
	}

	@step
	async deleteFileInGroup(fileName: string) {
		await this.openFileMenuByName(fileName)
		await this.deleteFromFileMenu()
	}

	@step
	async duplicateFileInGroup(fileName: string, newName?: string) {
		await this.openFileMenuByName(fileName)
		await this.duplicateFromFileMenu(newName)
	}

	@step
	async moveFileToGroup(fileName: string, targetGroupName: string) {
		await this.openFileMenuByName(fileName)
		await this.page.getByRole('menuitem', { name: 'Move to' }).hover()
		await this.page.getByRole('menuitem', { name: targetGroupName, exact: true }).click()
		await this.mutationResolution()
	}

	@step
	async moveFileToHome(fileName: string) {
		await this.openFileMenuByName(fileName)
		await this.page.getByRole('menuitem', { name: 'Move to' }).hover()
		await this.page.getByRole('menuitem', { name: 'My files' }).click()
		await this.mutationResolution()
	}

	@step
	async copyGroupInviteLink(groupName: string): Promise<string> {
		const group = this.getGroup(groupName)
		await this.expandGroup(groupName)
		const inviteButton = group.getByRole('button', { name: 'copy invite link' })
		await inviteButton.click()
		return await this.page.evaluate(() => navigator.clipboard.readText())
	}

	@step
	async copyGroupInviteLinkFromMenu(groupName: string): Promise<string> {
		const group = this.getGroup(groupName)
		const groupHeader = group.locator('[role="button"]').first()
		await groupHeader.hover()

		const moreOptionsButton = group.locator('button[title="More options"]')
		await moreOptionsButton.click()

		await this.page.getByRole('menuitem', { name: 'Copy invite link' }).click()
		return await this.page.evaluate(() => navigator.clipboard.readText())
	}

	async getGroupOrder(): Promise<string[]> {
		const groups = this.page.locator('[data-group-id]')
		const count = await groups.count()
		const groupNames: string[] = []
		for (let i = 0; i < count; i++) {
			const groupHeader = groups.nth(i).locator('[role="button"]').first()
			const text = await groupHeader.innerText()
			// Extract just the group name (text before any counts)
			const name = text.split('\n')[0].trim()
			groupNames.push(name)
		}
		return groupNames
	}

	@step
	async dragGroupToPosition(sourceGroupName: string, targetGroupName: string) {
		const sourceHeader = this.getGroup(sourceGroupName).locator('[role="button"]').first()
		const targetGroup = this.getGroup(targetGroupName)

		const sourceBox = await sourceHeader.boundingBox()
		const targetBox = await targetGroup.boundingBox()

		if (!sourceBox || !targetBox) throw new Error('Could not get bounding boxes')

		// Move to source
		await this.page.mouse.move(
			sourceBox.x + sourceBox.width / 2,
			sourceBox.y + sourceBox.height / 2
		)

		// Press and hold
		await this.page.mouse.down()

		// Small delay to let browser detect drag intent
		await this.page.waitForTimeout(100)

		// Drag to target position (below target group)
		await this.page.mouse.move(
			targetBox.x + targetBox.width / 2,
			targetBox.y + targetBox.height + 5,
			{ steps: 10 }
		)

		// Small delay before release
		await this.page.waitForTimeout(50)

		// Release
		await this.page.mouse.up()

		await this.mutationResolution()
	}

	@step
	async dragFileToGroup(fileName: string, targetGroupName: string) {
		const fileElement = this.getFileByName(fileName)
		const targetGroup = this.getGroup(targetGroupName)

		const fileBox = await fileElement.boundingBox()
		const targetBox = await targetGroup.boundingBox()

		if (!fileBox || !targetBox) throw new Error('Could not get bounding boxes')

		// Move to file
		await this.page.mouse.move(fileBox.x + fileBox.width / 2, fileBox.y + fileBox.height / 2)

		// Press and hold
		await this.page.mouse.down()

		// Small delay to let browser detect drag intent
		await this.page.waitForTimeout(100)

		// Drag to target group center
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
