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
		this.sidebar = sidebar
	}

	async toggleSidebar() {
		await this.sidebarToggle.click()
	}

	async ensureSidebarOpen() {
		const visible = await this.sidebar.isVisible()
		if (!visible) {
			await this.sidebarToggle.click()
		}
		this.sidebar.expectIsVisible()
	}
	async ensureSidebarClosed() {
		const visible = await this.sidebar.isVisible()
		if (visible) {
			await this.sidebarToggle.click()
		}
		this.sidebar.expectIsNotVisible()
	}

	async isLoaded() {
		expect(this.sidebarToggle).toBeVisible()
	}
}
