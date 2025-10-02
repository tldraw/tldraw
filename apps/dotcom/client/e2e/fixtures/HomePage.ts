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
	}

	@step
	async loginAs(email: string) {
		const isSideBarToggleVisible = await this.editor.sidebarToggle.isVisible()
		// We are already signed in
		if (isSideBarToggleVisible) return
		if (this.page.url() !== rootUrl) {
			await this.goto()
		}
		await expect(this.signInButton).toBeVisible()
		await this.signInButton.click()
		await this.page.getByLabel('Email address').fill(email)
		await this.page.getByRole('button', { name: 'Continue', exact: true }).click()
		await this.page.waitForTimeout(1000)
		await this.page.getByRole('textbox', { name: 'Enter verification code' }).fill('424242')
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
		await this.page.getByRole('button', { name: 'Continue', exact: true }).click()
		await this.page.getByRole('textbox', { name: 'Password' }).fill(password)
		await this.page.getByRole('button', { name: 'Continue', exact: true }).click()
		await this.page.waitForTimeout(1000)
		await expect(async () => {
			await expect(this.page.getByTestId('tla-sidebar-toggle')).toBeVisible()
		}).toPass()
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
