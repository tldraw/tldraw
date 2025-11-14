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
		// Get the group element
		const group = this.getGroup(groupName)

		// Hover over the group header to reveal the create file button
		const groupHeader = group.locator('[role="button"]').first()
		await groupHeader.hover()

		// Click the create file button (the one with edit icon)
		const createButton = group.locator('button[title="New file"]')
		await createButton.click()

		// Fill in the file name in the rename input
		const input = this.page.getByTestId('tla-sidebar-rename-input')
		await expect(input).toBeVisible()
		await input.fill(fileName)
		await this.page.keyboard.press('Enter')

		await this.mutationResolution()
	}
}
