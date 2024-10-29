import type { ElementHandle, Locator, Page } from '@playwright/test'
import { expect } from './tla-test'

export class Sidebar {
	public readonly fileLink = '[data-element="file-link"]'
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

	async expectIsVisible() {
		await expect(this.sidebarLogo).toBeVisible()
	}

	async expectIsNotVisible() {
		await expect(this.sidebarLogo).not.toBeVisible()
	}

	async createNewDocument() {
		await this.createFileButton.click()
	}

	async getFileLink() {
		const fileLink = await this.page.$('[data-element="file-link"]')
		if (!fileLink) {
			throw new Error('No file links found')
		}
		return fileLink
	}

	async openFileMenu(fileLink: ElementHandle<SVGElement | HTMLElement>) {
		await fileLink?.hover()
		const button = await fileLink?.$('button')
		await button?.click()
	}

	async deleteFromFileMenu() {
		// expect(this.page.getByTestId('file-menu')).toBeVisible()
		await this.page.getByRole('menuitem', { name: 'Delete' }).click()
	}
	async getNumberOfFiles() {
		return (await this.page.$$(this.fileLink)).length
	}
}
