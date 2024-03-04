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
			black: this.page.getByTestId('style.color.black'),
			grey: this.page.getByTestId('style.color.grey'),
			lightViolet: this.page.getByTestId('style.color.light-violet'),
			violet: this.page.getByTestId('style.color.violet'),
			blue: this.page.getByTestId('style.color.blue'),
			lightBlue: this.page.getByTestId('style.color.light-blue'),
			yellow: this.page.getByTestId('style.color.yellow'),
			orange: this.page.getByTestId('style.color.orange'),
			green: this.page.getByTestId('style.color.green'),
			lightGreen: this.page.getByTestId('style.color.light-green'),
			lightRed: this.page.getByTestId('style.color.light-red'),
			red: this.page.getByTestId('style.color.red'),
		}
		this.fill = {
			none: this.page.getByTestId('style.fill.none'),
			semi: this.page.getByTestId('style.fill.semi'),
			solid: this.page.getByTestId('style.fill.solid'),
			pattern: this.page.getByTestId('style.fill.pattern'),
		}
		this.dash = {
			draw: this.page.getByTestId('style.dash.draw'),
			dashed: this.page.getByTestId('style.dash.dashed'),
			dotted: this.page.getByTestId('style.dash.dotted'),
			solid: this.page.getByTestId('style.dash.solid'),
		}
		this.size = {
			s: this.page.getByTestId('style.size.s'),
			m: this.page.getByTestId('style.size.m'),
			l: this.page.getByTestId('style.size.l'),
			xl: this.page.getByTestId('style.size.xl'),
		}
		this.font = {
			draw: this.page.getByTestId('style.font.draw'),
			sans: this.page.getByTestId('style.font.sans'),
			serif: this.page.getByTestId('style.font.serif'),
			mono: this.page.getByTestId('style.font.mono'),
		}

		this.align = {
			start: this.page.getByTestId('style.align.start'),
			middle: this.page.getByTestId('style.align.middle'),
			end: this.page.getByTestId('style.align.end'),
		}
	}
	async getAfterElementStyle(style: Locator, property: string) {
		const getStyle = (element: Element, property: string) =>
			window.getComputedStyle(element, '::after').getPropertyValue(property)
		return await style.evaluate(getStyle, property)
	}

	async isHinted(style: Locator) {
		const backgroundColor = await this.getAfterElementStyle(style, 'background-color')
		return expect(backgroundColor).toBe('rgba(0, 0, 0, 0.055)')
	}

	async isNotHinted(style: Locator) {
		const backgroundColor = await this.getAfterElementStyle(style, 'background-color')
		// The color is different on mobile
		return expect(['rgba(0, 0, 0, 0.043)', 'rgba(0, 0, 0, 0)']).toContain(backgroundColor)
	}
	getElement() {
		return this.page.getByTestId('style.panel')
	}
}
