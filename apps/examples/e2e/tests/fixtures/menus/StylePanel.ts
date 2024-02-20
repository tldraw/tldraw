import { Locator, Page, expect } from '@playwright/test'

export class StylePanel {
	readonly stylesArray: string[]
	readonly colors: { [key: string]: Locator }
	readonly fill: { [key: string]: Locator }
	readonly dash: { [key: string]: Locator }
	readonly size: { [key: string]: Locator }
	readonly font: { [key: string]: Locator }
	readonly align: { [key: string]: Locator }

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
			lightViolet: this.page.locator('[data-testid="style.color.light-violet"]'),
			violet: this.page.locator('[data-testid="style.color.violet"]'),
			blue: this.page.locator('[data-testid="style.color.blue"]'),
			lightBlue: this.page.locator('[data-testid="style.color.light-blue"]'),
			yellow: this.page.locator('[data-testid="style.color.yellow"]'),
			orange: this.page.locator('[data-testid="style.color.orange"]'),
			green: this.page.locator('[data-testid="style.color.green"]'),
			lightGreen: this.page.locator('[data-testid="style.color.light-green"]'),
			lightRed: this.page.locator('[data-testid="style.color.light-red"]'),
			red: this.page.locator('[data-testid="style.color.red"]'),
		}
		this.fill = {
			none: this.page.locator('[data-testid="style.fill.none"]'),
			semi: this.page.locator('[data-testid="style.fill.semi"]'),
			solid: this.page.locator('[data-testid="style.fill.solid"]'),
			pattern: this.page.locator('[data-testid="style.fill.pattern"]'),
		}
		this.dash = {
			draw: this.page.locator('[data-testid="style.dash.draw"]'),
			dashed: this.page.locator('[data-testid="style.dash.dashed"]'),
			dotted: this.page.locator('[data-testid="style.dash.dotted"]'),
			solid: this.page.locator('[data-testid="style.dash.solid"]'),
		}
		this.size = {
			s: this.page.locator('[data-testid="style.size.s"]'),
			m: this.page.locator('[data-testid="style.size.m"]'),
			l: this.page.locator('[data-testid="style.size.l"]'),
			xl: this.page.locator('[data-testid="style.size.xl"]'),
		}
		this.font = {
			draw: this.page.locator('[data-testid="style.font.draw"]'),
			sans: this.page.locator('[data-testid="style.font.sans"]'),
			serif: this.page.locator('[data-testid="style.font.serif"]'),
			mono: this.page.locator('[data-testid="style.font.mono"]'),
		}
		this.align = {
			start: this.page.locator('[data-testid="style.align.start"]'),
			middle: this.page.locator('[data-testid="style.align.middle"]'),
			end: this.page.locator('[data-testid="style.align.end"]'),
		}
	}
	async isHinted(style: Locator) {
		const getAfterElementStyle = (element: Element, property: string) =>
			window.getComputedStyle(element, '::after').getPropertyValue(property)
		const opacity = await style.evaluate(getAfterElementStyle, 'opacity')
		return expect(opacity).toBe('1')
	}
	async isNotHinted(style: Locator) {
		const getAfterElementStyle = (element: Element, property: string) =>
			window.getComputedStyle(element, '::after').getPropertyValue(property)
		const opacity = await style.evaluate(getAfterElementStyle, 'opacity')
		return expect(opacity).toBe('0')
	}
	getElement() {
		return this.page.locator('[data-testid="style.panel"]')
	}
}
