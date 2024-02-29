import { Locator, Page } from '@playwright/test'

export class PageMenu {
	readonly pagemenuButton: Locator
	readonly header: Locator

	constructor(public readonly page: Page) {
		this.page = page
		this.pagemenuButton = this.page.getByTestId('page-menu.button')
		this.header = this.page.getByRole('dialog').getByText('Pages')
	}
}
