import type { Locator, Page } from '@playwright/test'
import { expect, step } from './tla-test'

export class GroupInviteDialog {
	public readonly dialog: Locator
	public readonly acceptButton: Locator
	public readonly declineButton: Locator

	constructor(public readonly page: Page) {
		this.dialog = this.page.getByText("You've been invited to group")
		this.acceptButton = this.page.getByRole('button', { name: 'Accept and join group' })
		this.declineButton = this.page.getByRole('button', { name: 'No thanks' })
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

	@step
	async acceptInvitation() {
		await this.acceptButton.click()
	}

	@step
	async declineInvitation() {
		await this.declineButton.click()
	}
}
