import type { Locator, Page } from '@playwright/test'
import { expect } from './tla-test'

export class Sidebar {
	public readonly sidebarLogo: Locator
	public readonly createFileButton: Locator
	constructor(public readonly page: Page) {
		this.sidebarLogo = this.page.getByTestId('tla-sidebar-logo-icon')
		this.createFileButton = this.page.getByTestId('tla-create-file')
	}

	async goto() {
		await this.page.goto('http://localhost:3000/q')
	}

	async isVisible() {
		return this.sidebarLogo.isVisible()
	}

	expectIsVisible() {
		expect(this.sidebarLogo).toBeVisible()
	}

	expectIsNotVisible() {
		expect(this.sidebarLogo).not.toBeVisible()
	}

	async createNewDocument() {
		await this.createFileButton.click()
	}
}
