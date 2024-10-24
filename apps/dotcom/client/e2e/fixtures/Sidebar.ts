import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

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

	async isLoaded() {
		expect(this.sidebarLogo).toBeVisible()
	}

	async createNewDocument() {
		await this.createFileButton.click()
	}
}
