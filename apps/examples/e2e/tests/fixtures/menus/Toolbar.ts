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
		this.toolLock = this.page.locator('[data-testid="tool-lock"]')
		this.moreToolsButton = this.page.locator('[data-testid="tools.more-button"]')
		this.moreToolsPopover = this.page.locator('[data-testid="tools.more-content"]')
		this.mobileStylesButton = this.page.locator('[data-testid="mobile-styles.button"]')
		this.tools = {
			select: this.page.locator('[data-testid="tools.select"]'),
			draw: this.page.locator('[data-testid="tools.draw"]'),
			arrow: this.page.locator('[data-testid="tools.arrow"]'),
			cloud: this.page.locator('[data-testid="tools.cloud"]'),
			eraser: this.page.locator('[data-testid="tools.eraser"]'),
		}
		this.popOverTools = {
			popoverCloud: this.page.locator('[data-testid="tools.more.cloud"]'),
			popoverFrame: this.page.locator('[data-testid="tools.more.frame"]'),
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
