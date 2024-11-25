import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { Editor } from './Editor'
import { step } from './tla-test'

const rootUrl = 'http://localhost:3000/q'

export class HomePage {
	public readonly signUpButton: Locator
	public readonly tldrawEditor: Locator
	constructor(
		private readonly page: Page,
		private readonly editor: Editor
	) {
		this.signUpButton = this.page.getByTestId('tla-sign-up')
		this.tldrawEditor = this.page.getByTestId('tla-editor')
	}

	@step
	async loginAs(email: string) {
		const isSideBarToggleVisible = await this.editor.sidebarToggle.isVisible()
		// We are already logged in
		if (isSideBarToggleVisible) return
		if (this.page.url() !== rootUrl) {
			await this.goto()
		}
		await expect(this.signUpButton).toBeVisible()
		await this.page.click('text=Sign in')
		await this.page.getByLabel('Email address').fill(email)
		await this.page.getByRole('button', { name: 'Continue', exact: true }).click()
		await this.page.waitForTimeout(1000)
		await this.page.getByLabel('Enter verification code. Digit').fill('424242')
		await expect(async () => {
			await expect(this.page.getByRole('button', { name: 'Share' })).toBeVisible()
		}).toPass()
	}

	async expectSignInButtonVisible() {
		await expect(async () => {
			await expect(this.signUpButton).toBeVisible()
		}).toPass()
	}

	async expectSignInButtonNotVisible() {
		await expect(async () => {
			await expect(this.signUpButton).not.toBeVisible()
		}).toPass()
	}

	async goto() {
		await this.page.goto(rootUrl, { waitUntil: 'load' })
	}

	async isLoaded() {
		await expect(async () => {
			await expect(this.page).toHaveTitle(/tldraw/)
			await expect(this.tldrawEditor).toBeVisible({ timeout: 10000 })
		}).toPass()
	}
}
