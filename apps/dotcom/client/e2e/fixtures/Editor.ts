import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { Sidebar } from './Sidebar'

export class Editor {
	public readonly sidebarToggle: Locator
	constructor(
		public readonly page: Page,
		private readonly sidebar: Sidebar
	) {
		this.sidebarToggle = this.page.getByTestId('tla-sidebar-toggle')
	}

	async toggleSidebar() {
		await this.sidebarToggle.click()
	}

	async ensureSidebarOpen() {
		const visible = await this.sidebar.isVisible()
		if (!visible) {
			await this.sidebarToggle.click()
		}
		await this.sidebar.expectIsVisible()
	}
	async ensureSidebarClosed() {
		const visible = await this.sidebar.isVisible()
		if (visible) {
			await this.sidebarToggle.click()
		}
		await this.sidebar.expectIsNotVisible()
	}

	async isLoaded() {
		await expect(this.sidebarToggle).toBeVisible()
	}

	async createRect() {
		await this.page.getByTestId('tools.rectangle').click()
		await this.page.locator('.tl-background').click()
	}

	async getNumberOfShapes() {
		return (await this.page.$$('.tl-shape')).length
	}
}
