import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class Editor {
	public readonly sidebarToggle: Locator
	constructor(public readonly page: Page) {
		this.sidebarToggle = this.page.getByTestId('tla-sidebar-toggle')
	}

	async toggleSidebar() {
		await this.sidebarToggle.click()
	}

	async isLoaded() {
		expect(this.sidebarToggle).toBeVisible()
	}
}
