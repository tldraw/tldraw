import { Locator, Page, expect } from '@playwright/test'

export class Toolbar {
	readonly toolLock: Locator
	readonly moreToolsButton: Locator
	readonly moreToolsPopover: Locator
	readonly mobileStylesButton: Locator
	readonly tools: { [key: string]: Locator }
	readonly popOverTools: { [key: string]: Locator }

	constructor(public readonly page: Page) {
		this.page = page
		this.toolLock = this.page.getByTestId('tool-lock')
		this.moreToolsButton = this.page.getByTestId('tools.more-button')
		this.moreToolsPopover = this.page.getByTestId('tools.more-content')
		this.mobileStylesButton = this.page.getByTestId('mobile-styles.button')
		this.tools = {
			select: this.page.getByTestId('tools.select'),
			draw: this.page.getByTestId('tools.draw'),
			arrow: this.page.getByTestId('tools.arrow'),
			cloud: this.page.getByTestId('tools.cloud'),
			eraser: this.page.getByTestId('tools.eraser'),
			rectangle: this.page.getByTestId('tools.rectangle'),
			hand: this.page.getByTestId('tools.hand'),
		}
		this.popOverTools = {
			popoverCloud: this.page.getByTestId('tools.more.cloud'),
			popoverFrame: this.page.getByTestId('tools.more.frame'),
			popoverRectangle: this.page.getByTestId('tools.more.rectangle'),
		}
	}
	async clickTool(tool: Locator) {
		await tool.click()
	}
	async isSelected(tool: Locator) {
		// pseudo elements aren't exposed to the DOM, but we can check the color as a proxy
		const expectedColor = 'rgb(255, 255, 255)'
		await expect(tool).toHaveCSS('color', expectedColor)
	}
	async isNotSelected(tool: Locator) {
		const expectedColor = 'rgb(46, 46, 46)'
		await expect(tool).toHaveCSS('color', expectedColor)
	}
}
