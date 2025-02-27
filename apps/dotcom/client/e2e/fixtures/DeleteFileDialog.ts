import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class DeleteFileDialog {
	public readonly dialog: Locator
	public readonly confirmButton: Locator
	public readonly cancelButton: Locator

	constructor(public readonly page: Page) {
		this.dialog = this.page.getByRole('dialog', { name: 'Delete file' })
		this.confirmButton = this.dialog.getByRole('button', { name: 'Delete' })
		this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' })
	}

	async isVisible() {
		return this.dialog.isVisible()
	}

	async expectIsVisible() {
		await expect(this.dialog).toBeVisible()
	}

	async expectIsNotVisible() {
		await expect(this.dialog).not.toBeVisible()
	}

	async confirmDeletion() {
		await this.confirmButton.click()
	}

	async cancelDeletion() {
		await this.cancelButton.click()
	}
}
