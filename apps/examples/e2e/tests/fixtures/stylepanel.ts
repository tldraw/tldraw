import { Page } from '@playwright/test'

export class StylePanel {
	readonly stylesArray: string[]

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
	}
}
