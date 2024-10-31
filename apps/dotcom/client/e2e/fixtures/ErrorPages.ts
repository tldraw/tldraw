import { Locator, Page } from '@playwright/test'
import { expect } from '../fixtures/tla-test'

export class ErrorPage {
	public readonly notFound: Locator
	public readonly pageNotFound: Locator
	public readonly privateFile: Locator

	constructor(public readonly page: Page) {
		this.notFound = this.page.getByRole('heading', { name: 'Not found' })
		this.pageNotFound = this.page.getByRole('heading', { name: 'Page not found' })
		this.privateFile = this.page.getByRole('heading', { name: 'Private file' })
	}

	async expectNotFoundVisible() {
		await expect(this.notFound).toBeVisible()
	}

	async expectNotFoundNotVisible() {
		await expect(this.notFound).not.toBeVisible()
	}

	async expectPageNotFoundVisible() {
		await expect(this.pageNotFound).toBeVisible()
	}

	async expectPrivateFileVisible() {
		await expect(this.privateFile).toBeVisible()
	}
}
