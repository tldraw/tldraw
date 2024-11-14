import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { Sidebar } from './Sidebar'

export class Editor {
	public readonly sidebarToggle: Locator
	private readonly fileName: Locator
	private readonly shapes: Locator

	constructor(
		public readonly page: Page,
		private readonly sidebar: Sidebar
	) {
		this.sidebarToggle = this.page.getByTestId('tla-sidebar-toggle')
		this.fileName = this.page.getByTestId('tla-file-name')
		this.shapes = this.page.locator('.tl-shape')
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

	async expectShapesCount(expected: number) {
		await expect(this.shapes).toHaveCount(expected)
	}

	async getCurrentFileName() {
		return await this.fileName.innerText()
	}

	async rename(newName: string) {
		await this.fileName.click()
		await this.page.getByRole('textbox').fill(newName)
		await this.page.keyboard.press('Enter')
	}
}
