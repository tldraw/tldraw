import { Locator, Page, expect } from '@playwright/test'

export class RichTextToolbar {
	readonly tools: { [key: string]: Locator }

	constructor(public readonly page: Page) {
		this.page = page
		this.tools = {
			bold: this.page.getByTestId('rich-text.bold'),
			strike: this.page.getByTestId('rich-text.strike'),
			highlight: this.page.getByTestId('rich-text.highlight'),
			code: this.page.getByTestId('rich-text.code'),
			link: this.page.getByTestId('rich-text.link'),
			linkRemove: this.page.getByTestId('rich-text.link-remove'),
			heading: this.page.getByTestId('rich-text.heading'),
			bulletList: this.page.getByTestId('rich-text.bulletList'),
		}
	}
	async clickTool(tool: Locator) {
		await tool.click()
	}
	async isSelected(tool: Locator) {
		// pseudo elements aren't exposed to the DOM, but we can check the color as a proxy
		const expectedColor = 'rgb(46, 46, 46)'
		await expect(tool).toHaveCSS('color', expectedColor)
	}
	async isNotSelected(tool: Locator) {
		const expectedColor = 'rgb(255, 255, 255)'
		await expect(tool).toHaveCSS('color', expectedColor)
	}
}
