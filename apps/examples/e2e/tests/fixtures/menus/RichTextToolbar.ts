import { Locator, Page, expect } from '@playwright/test'

export class RichTextToolbar {
	container: Locator
	readonly tools: { [key: string]: Locator }

	constructor(public readonly page: Page) {
		this.container = this.page.getByTestId('contextual-toolbar')
		this.tools = {
			bold: this.page.getByTestId('rich-text.bold'),
			italic: this.page.getByTestId('rich-text.italic'),
			code: this.page.getByTestId('rich-text.code'),
			strike: this.page.getByTestId('rich-text.strike'),
			link: this.page.getByTestId('rich-text.link'),
			bulletList: this.page.getByTestId('rich-text.bulletList'),
			highlight: this.page.getByTestId('rich-text.highlight'),
			linkRemove: this.page.getByTestId('rich-text.link-remove'),
			heading: this.page.getByTestId('rich-text.heading'),
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

	async getSelectionBounds() {
		return this.page.evaluate(() => {
			const selection = window.getSelection()

			// If there are no selections, don't return a box
			if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return

			// Get a common box from all of the ranges' screen rects
			let minX = Infinity
			let minY = Infinity
			let maxX = -Infinity
			let maxY = -Infinity

			for (let i = 0; i < selection.rangeCount; i++) {
				const range = selection.getRangeAt(i)
				const box = range.getBoundingClientRect()
				minX = Math.min(minX, box.left)
				minY = Math.min(minY, box.top)
				maxX = Math.max(maxX, box.right)
				maxY = Math.max(maxY, box.bottom)
			}

			return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
		})
	}
}
