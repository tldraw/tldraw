import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { Editor } from './Editor'
import { step } from './tla-test'

const rootUrl = 'http://localhost:3000/'

export class HomePage {
	public readonly signInButton: Locator
	public readonly tldrawEditor: Locator
	public readonly tldrawCanvas: Locator
	constructor(
		private readonly page: Page,
		private readonly editor: Editor
	) {
		this.signInButton = this.page.getByTestId('tla-sign-in-button')
		this.tldrawEditor = this.page.getByTestId('tla-editor')
		this.tldrawCanvas = this.page.getByTestId('canvas')

		// Set localStorage flag based on environment variable
		const initMode = process.env.TLDRAW_INIT_MODE || 'legacy'
		this.page.addInitScript((mode) => {
			if (mode === 'new') {
				// eslint-disable-next-line no-restricted-syntax
				localStorage.setItem('tldraw_groups_init', 'true')
			} else {
				// eslint-disable-next-line no-restricted-syntax
				localStorage.removeItem('tldraw_groups_init')
			}
		}, initMode)
	}

	@step
	async loginAs(email: string) {
		if (this.page.url() !== rootUrl) {
			await this.goto()
		}
		await this.page.waitForLoadState('domcontentloaded')
		const isSideBarToggleVisible =
			(await this.editor.sidebarToggle.isVisible().catch(() => false)) ?? false
		if (isSideBarToggleVisible) return

		await expect(this.signInButton).toBeVisible()

		// Wait for any dialog overlays to be gone before clicking
		await this.page.waitForTimeout(500)
		const dialogOverlay = this.page.locator('.tlui-dialog__overlay')
		if ((await dialogOverlay.count()) > 0) {
			await expect(dialogOverlay).not.toBeVisible({ timeout: 5000 })
		}

		await this.signInButton.click({ force: true })
		await this.page.getByLabel('Email address').fill(email)
		await this.page.getByTestId('tla-continue-with-email-button').click()
		await this.page.waitForTimeout(1000)
		await this.page.locator('#tla-verification-code').fill('424242')
		// Wait till we're on a file page, e.g. /f/:someId
		await this.page.waitForURL(new RegExp(`${rootUrl}f/.*`))
		await this.handleTermsIfNeeded()
		await expect(async () => {
			await expect(this.page.getByTestId('tla-sidebar-toggle')).toBeVisible()
		}).toPass()
	}

	async loginWithEmailAndPassword(email: string, password: string) {
		const isSideBarToggleVisible = await this.editor.sidebarToggle.isVisible()
		// We are already signed in
		if (isSideBarToggleVisible) return
		await expect(this.signInButton).toBeVisible()
		await this.signInButton.click()
		await this.page.getByLabel('Email address').fill(email)
		// Note: This method is for staging/production Clerk flows that use passwords
		// The password field appears after clicking continue on email
		await this.page.getByTestId('tla-continue-with-email-button').click()
		await this.page.waitForTimeout(500)
		await this.page.getByRole('textbox', { name: 'Password' }).fill(password)
		// After entering password, look for any Continue button (Clerk's default buttons don't have test IDs)
		await this.page.getByRole('button', { name: 'Continue', exact: true }).click()
		await this.page.waitForTimeout(1000)
		await this.handleTermsIfNeeded()
		await expect(async () => {
			await expect(this.page.getByTestId('tla-sidebar-toggle')).toBeVisible()
		}).toPass()
	}

	private async handleTermsIfNeeded() {
		const acceptAndContinueButton = this.page.getByTestId('tla-accept-and-continue-button')
		// Wait a bit for the dialog to potentially appear
		await this.page.waitForTimeout(500)
		if ((await acceptAndContinueButton.count()) === 0) return
		await expect(acceptAndContinueButton).toBeVisible()
		await expect(acceptAndContinueButton).toBeEnabled()
		await acceptAndContinueButton.click()
		// Wait for the button click to complete
		await this.page.waitForTimeout(500)
	}

	async expectSignInButtonVisible() {
		await expect(async () => {
			await expect(this.signInButton).toBeVisible()
		}).toPass()
	}

	async expectSignInButtonNotVisible() {
		await expect(async () => {
			await expect(this.signInButton).not.toBeVisible()
		}).toPass()
	}

	async goto(url = rootUrl) {
		await this.page.goto(url, { waitUntil: 'load' })
	}

	async isLoaded() {
		await expect(async () => {
			await expect(this.tldrawEditor).toBeVisible({ timeout: 10000 })
			await expect(this.tldrawCanvas).toBeVisible({ timeout: 10000 })
		}).toPass()
	}
}
