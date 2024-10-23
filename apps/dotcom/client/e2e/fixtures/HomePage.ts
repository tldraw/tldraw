import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class HomePage {
	public readonly signInButton: Locator
	constructor(public readonly page: Page) {
		this.signInButton = this.page.getByTestId('tla-signin-button')
	}

	async login() {
		const isSideBarVisible = await this.page.isVisible('[data-testid="tla-sidebar-toggle"]')
		// We are already logged in
		if (isSideBarVisible) return
		await this.goto()
		expect(this.signInButton).toBeVisible()
		await this.page.click('text=Sign in')
		await this.page.getByLabel('Email address').fill('huppy+clerk_test@tldraw.com')
		await this.page.getByRole('button', { name: 'Continue', exact: true }).click()
		await this.page.getByLabel('Enter verification code. Digit').fill('424242')
	}

	async goto() {
		await this.page.goto('http://localhost:3000/q')
	}

	async isLoaded() {
		await expect(this.page).toHaveTitle(/tldraw/)
		expect(this.signInButton).toBeVisible()
	}
}
