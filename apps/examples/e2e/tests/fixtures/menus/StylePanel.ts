import { Locator, Page } from '@playwright/test'

export class StylePanel {
	readonly stylesArray: string[]
	readonly colors: { [key: string]: Locator }

	constructor(public readonly page: Page) {
		this.page = page
		this.stylesArray = [
			'style.color',
			'style.opacity',
			'style.fill',
			'style.dash',
			'style.size',
			'style.font',
			'style.align',
		]
		this.colors = {
			black: this.page.locator('[data-testid="style.color.black"]'),
			grey: this.page.locator('[data-testid="style.color.grey"]'),
			'light-violet': this.page.locator('[data-testid="style.color.light-violet"]'),
			violet: this.page.locator('[data-testid="style.color.violet"]'),
			blue: this.page.locator('[data-testid="style.color.blue"]'),
			'light-blue': this.page.locator('[data-testid="style.color.light-blue"]'),
			yellow: this.page.locator('[data-testid="style.color.yellow"]'),
			orange: this.page.locator('[data-testid="style.color.orange"]'),
			green: this.page.locator('[data-testid="style.color.green"]'),
			'light-green': this.page.locator('[data-testid="style.color.light-green"]'),
			'light-red': this.page.locator('[data-testid="style.color.light-red"]'),
			red: this.page.locator('[data-testid="style.color.red"]'),
		}
	}
	getElement() {
		return this.page.locator('[data-testid="style.panel"]')
	}
}
