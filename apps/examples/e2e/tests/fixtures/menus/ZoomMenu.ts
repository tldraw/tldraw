import { Page } from '@playwright/test'

export class ZoomMenu {
	constructor(private readonly page: Page) {
		this.page = page
	}
}
