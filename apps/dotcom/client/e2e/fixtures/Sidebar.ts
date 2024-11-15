import type { Locator, Page } from '@playwright/test'
import { expect } from './tla-test'

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

	async goto() {
		await this.page.goto('http://localhost:3000/q')
	}

	async isVisible() {
		return this.sidebarLogo.isVisible()
	}

	async expectIsVisible() {
		await expect(this.sidebarLogo).toBeVisible()
	}

	async expectIsNotVisible() {
		await expect(this.sidebarLogo).not.toBeVisible()
	}

	async createNewDocument() {
		await this.createFileButton.click()
	}

	async getNumberOfFiles() {
		return (await this.page.$$(this.fileLink)).length
	}

	async openPreferences() {
		await this.sidebarBottom.hover()
	}

	async setDarkMode() {
		await this.openPreferences()
		await this.page.getByRole('button', { name: 'Account menu' }).click()
		await this.preferencesButton.hover()
		await this.themeButton.hover()
		await this.darkModeButton.click()
	}

	async signOut() {
		await this.openPreferences()
		await this.sidebarBottom.getByRole('button').click()
		await this.signOutButton.click()
	}

	async expectToContainText(text: string) {
		await expect(this.sidebarLayout).toContainText(text)
	}

	async expectNotToContainText(text: string) {
		await expect(this.sidebarLayout).not.toContainText(text)
	}

	getFirstFileLink() {
		return this.getFileLink(0)
	}

	getFileLink(index: number) {
		return this.page.getByTestId(`tla-file-link-${index}`)
	}

	async getFirstFileName() {
		return await this.getFileName(0)
	}

	async getFileName(index: number) {
		const fileName = this.page.getByTestId(`tla-file-name-${index}`)
		return await fileName.innerText()
	}
	async openFileMenu(fileLink: Locator) {
		await fileLink?.hover()
		const button = fileLink.getByRole('button')
		await button?.click()
	}

	async deleteFromFileMenu() {
		await this.page.getByRole('menuitem', { name: 'Delete' }).click()
	}

	async renameFile(index: number, newName: string) {
		const fileLink = this.getFileLink(index)
		await this.openFileMenu(fileLink)
		await this.renameFromFileMenu(newName)
	}

	async renameFromFileMenu(name: string) {
		await this.page.getByRole('menuitem', { name: 'Rename' }).click()
		const input = this.page.getByRole('textbox')
		await input.fill(name)
		await this.page.keyboard.press('Enter')
	}

	private async duplicateFromFileMenu() {
		await this.page.getByRole('menuitem', { name: 'Duplicate' }).click()
	}

	async duplicateFile(index: number) {
		const fileLink = this.getFileLink(index)
		await this.openFileMenu(fileLink)
		await this.duplicateFromFileMenu()
	}

	async copyFileLinkFromFileMenu() {
		await this.page.getByRole('menuitem', { name: 'Copy link' }).click()
	}

	async copyFileLink(index: number) {
		const fileLink = this.getFileLink(index)
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
}
