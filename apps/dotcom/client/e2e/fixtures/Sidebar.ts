import type { Locator, Page } from '@playwright/test'
import { expect } from './tla-test'

export class Sidebar {
	public readonly fileLink = '[data-element="file-link"]'
	public readonly sidebarLayout: Locator
	public readonly sidebarLogo: Locator
	public readonly createFileButton: Locator
	public readonly sidebarBottom: Locator
	public readonly preferencesButton: Locator
	public readonly themeButton: Locator
	public readonly darkModeButton: Locator
	public readonly signOutButton: Locator
	constructor(public readonly page: Page) {
		this.sidebarLayout = this.page.getByTestId('tla-sidebar-layout')
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
		await this.sidebarBottom.getByRole('button').click()
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
}
