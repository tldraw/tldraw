import { Locator, Page } from '@playwright/test'

export class PageMenu {
	readonly pagemenuButton: Locator
	readonly header: Locator
	readonly createButton: Locator
	readonly editButton: Locator
	readonly pageList: Locator
	readonly pageItems: Locator

	constructor(public readonly page: Page) {
		this.page = page
		this.pagemenuButton = this.page.getByTestId('page-menu.button')
		this.header = this.page.getByRole('dialog').getByText('Pages')
		this.createButton = this.page.getByTestId('page-menu.create')
		this.editButton = this.page.getByTestId('page-menu.edit')
		this.pageList = this.page.getByTestId('page-menu.list')
		this.pageItems = this.page.getByTestId('page-menu.item')
	}

	async getPageItem(index: number) {
		return this.pageItems.nth(index)
	}

	getPageItemByName(name: string) {
		return this.page.getByTestId('page-menu.item').filter({ hasText: name })
	}
}
