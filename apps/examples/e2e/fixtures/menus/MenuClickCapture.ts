import { Locator, Page } from '@playwright/test'

export class MenuClickCapture {
	readonly content: Locator

	constructor(public readonly page: Page) {
		this.page = page
		this.content = this.page.getByTestId('menu-click-capture.content')
	}
}
