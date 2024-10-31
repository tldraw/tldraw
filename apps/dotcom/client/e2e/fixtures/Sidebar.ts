import type { Locator, Page } from '@playwright/test'
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

	async getFileLink(fileName?: string) {
		const fileLink = fileName
			? this.page.getByTestId(fileName)
			: this.page.locator('[data-element="file-link"]')
		if (!fileLink) {
			throw new Error('No file links found')
		}
		return fileLink
	}

	async openFileMenu(fileLink: Locator) {
		await fileLink?.hover()
		const button = await fileLink.getByRole('button')
		await button?.click()
	}

	async deleteFromFileMenu() {
		await this.page.getByRole('menuitem', { name: 'Delete' }).click()
	}

	async renameFromFileMenu(name: string) {
		await this.page.getByRole('menuitem', { name: 'Rename' }).click()
		const input = this.page.getByRole('textbox')
		await input.fill(name)
		await this.page.keyboard.press('Enter')
	}

	async duplicateFromFileMenu() {
		await this.page.getByRole('menuitem', { name: 'Duplicate' }).click()
	}

	async getNumberOfFiles() {
		return (await this.page.$$(this.fileLink)).length
	}
	async getAfterElementStyle(element: Locator, property: string): Promise<string> {
		return element.evaluate((el, property) => {
			return window.getComputedStyle(el, '::after').getPropertyValue(property)
		}, property)
	}
}
