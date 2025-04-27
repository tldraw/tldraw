import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { Sidebar } from './Sidebar'
import { step } from './tla-test'

export class Editor {
	public readonly sidebarToggle: Locator
	private readonly fileName: Locator
	private readonly shapes: Locator
	private readonly pageMenu: Locator

	constructor(
		public readonly page: Page,
		private readonly sidebar: Sidebar
	) {
		this.sidebarToggle = this.page.getByTestId('tla-sidebar-toggle')
		this.fileName = this.page.getByTestId('tla-file-name')
		this.shapes = this.page.locator('.tl-shape')
		this.pageMenu = this.page.getByTestId('tla-page-menu')
	}

	async toggleSidebar() {
		await this.sidebarToggle.click()
	}

	@step
	async ensureSidebarOpen() {
		const visible = await this.sidebar.isVisible()
		if (!visible) {
			await this.sidebarToggle.click()
		}
		await this.sidebar.expectIsVisible()
	}

	@step
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

	@step
	async expectShapesCount(expected: number) {
		await expect(this.shapes).toHaveCount(expected)
	}

	async getCurrentFileName() {
		return await this.fileName.innerText()
	}

	@step
	async rename(newName: string) {
		await this.fileName.click()
		await this.page.getByRole('textbox').fill(newName)
		await this.page.keyboard.press('Enter')
	}

	@step
	async openPageMenu() {
		await this.pageMenu.click()
	}

	@step
	async createNewPage() {
		await this.page.getByTestId('page-menu.button').click()
		await expect(this.page.getByTestId('page-menu.item').first()).toBeVisible()
		const count = await this.page.getByTestId('page-menu.item').count()
		await this.page.getByTestId('page-menu.create').click()
		await expect(this.page.getByTestId('page-menu.item')).toHaveCount(count + 1)
		await this.page.keyboard.press('Enter')
		await this.page.keyboard.press('Escape')
	}

	@step
	async createTextShape(text: string) {
		await this.page.locator('.tl-background').click({ clickCount: 2 })
		await this.page.locator('div[contenteditable="true"]').fill(text)
		await this.page.pause()
	}
}
