import type { Locator, Page } from '@playwright/test'
import { expect, step } from './tla-test'

export class Sidebar {
	public readonly fileLink = '[data-element="file-link"]'

	public readonly sidebarLayout: Locator
	public readonly sidebar: Locator
	public readonly sidebarLogo: Locator
	public readonly createFileButton: Locator
	public readonly sidebarBottom: Locator
	public readonly preferencesButton: Locator
	public readonly themeButton: Locator
	public readonly darkModeButton: Locator
	public readonly signOutButton: Locator
	constructor(public readonly page: Page) {
		this.sidebarLayout = this.page.getByTestId('tla-sidebar-layout')
		this.sidebar = this.page.getByTestId('tla-sidebar')
		this.sidebarLogo = this.page.getByTestId('tla-sidebar-logo-icon')
		this.createFileButton = this.page.getByTestId('tla-create-file')
		this.sidebarBottom = this.page.getByTestId('tla-sidebar-bottom')
		this.preferencesButton = this.page.getByText('Preferences')
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

	async createNewDocument() {
		await this.createFileButton.click()
	}

	async getNumberOfFiles() {
		return (await this.page.$$(this.fileLink)).length
	}

	async openAccountMenu() {
		await this.sidebarBottom.hover()
		await this.page.getByRole('button', { name: 'Account menu' }).click()
	}

	@step
	async setDarkMode() {
		await this.openAccountMenu()
		await this.themeButton.hover()
		await this.darkModeButton.click()
	}

	@step
	async openLanguageMenu(languageButtonText: string) {
		await this.openAccountMenu()
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
	}

	@step
	async signOut() {
		await this.openAccountMenu()
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
	}

	@step
	async renameFile(index: number, newName: string) {
		const fileLink = this.getFileLink('today', index)
		await this.openFileMenu(fileLink)
		await this.renameFromFileMenu(newName)
	}

	@step
	async renameFromFileMenu(name: string) {
		await this.page.getByRole('menuitem', { name: 'Rename' }).click()
		const input = this.page.getByRole('textbox')
		await input.fill(name)
		await this.page.keyboard.press('Enter')
	}

	@step
	private async duplicateFromFileMenu() {
		await this.page.getByRole('menuitem', { name: 'Duplicate' }).click()
	}

	@step
	async pinFromFileMenu(index: number) {
		const fileLink = this.getFileLink('today', index)
		await this.openFileMenu(fileLink)
		await this.page.getByRole('menuitem', { name: 'Pin' }).click()
	}

	@step
	async unpinFromFileMenu(index: number) {
		const fileLink = this.getFileLink('pinned', index)
		await this.openFileMenu(fileLink)
		await this.page.getByRole('menuitem', { name: 'Unpin' }).click()
	}

	@step
	async duplicateFile(index: number) {
		const fileLink = this.getFileLink('today', index)
		await this.openFileMenu(fileLink)
		await this.duplicateFromFileMenu()
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
}
