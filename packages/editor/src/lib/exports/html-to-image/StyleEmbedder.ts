import { objectMapValues, uniqueId } from '@tldraw/utils'
import { FontEmbedder } from './FontEmbedder'
import { resourceToDataUrl } from './fetchCache'
import { parseCssValueUrls, shouldIncludeCssProperty } from './parseCss'

interface ElementStyleInfo {
	self: Record<string, string>
	before: Record<string, string> | undefined
	after: Record<string, string> | undefined
}

export class StyleEmbedder {
	constructor(private readonly root: Element) {}
	private readonly styles = new Map<HTMLElement, ElementStyleInfo>()
	private readonly fonts = new FontEmbedder()

	private defaultsByTagName: Record<string, Record<string, string>> = {}

	read(element: HTMLElement) {
		const defaults = this.getDefaultsForTagName(element.tagName.toLowerCase())

		const info: ElementStyleInfo = {
			self: element.computedStyleMap
				? this.fromComputedStyleMap(element.computedStyleMap(), defaults)
				: this.fromComputedStyle(window.getComputedStyle(element), defaults),

			before: this.getPseudoElementStyle(element, ':before'),
			after: this.getPseudoElementStyle(element, ':after'),
		}

		this.styles.set(element, info)
		for (const child of element.children) {
			this.read(child as HTMLElement)
		}
	}

	getDefaultsForTagName(tagName: string) {
		if (!this.defaultsByTagName[tagName]) {
			const element = document.createElement(tagName)
			this.root.appendChild(element)
			this.defaultsByTagName[tagName] = element.computedStyleMap
				? this.fromComputedStyleMap(element.computedStyleMap(), {})
				: this.fromComputedStyle(window.getComputedStyle(element), {})
			this.root.removeChild(element)
		}
		return this.defaultsByTagName[tagName]
	}

	fetchResources() {
		const promises: Promise<void>[] = []

		for (const info of this.styles.values()) {
			for (const styles of objectMapValues(info)) {
				if (!styles) continue
				for (const [property, value] of Object.entries(styles)) {
					if (property === 'font-family') {
						this.fonts.onFoundUsedFont(value.toLowerCase())
					}

					const urlMatches = parseCssValueUrls(value)
					if (urlMatches.length === 0) continue

					promises.push(
						...urlMatches.map(async ({ url, original }) => {
							const dataUrl = (await resourceToDataUrl(url)) ?? 'data:'
							styles[property] = value.replace(original, `url("${dataUrl}")`)
						})
					)
				}
			}
		}

		return Promise.all(promises)
	}

	async embedStyles(): Promise<string> {
		let css = await this.fonts.createCss()

		for (const [element, info] of this.styles) {
			if (info.after || info.before) {
				const className = `pseudo-${uniqueId()}`
				element.classList.add(className)

				if (info.before) {
					css += `.${className}::before {${formatCss(info.before)}}\n`
				}
				if (info.after) {
					css += `.${className}::after {${formatCss(info.after)}}\n`
				}
			}

			for (const [property, value] of Object.entries(info.self)) {
				;(element as HTMLElement).style.setProperty(property, value)
			}

			if (element.style.fontKerning === 'auto') {
				element.style.fontKerning = 'normal'
			}
		}

		return css
	}

	getPseudoElementStyle(element: Element, pseudo: string) {
		const style = window.getComputedStyle(element, pseudo)
		const content = style.getPropertyValue('content')
		if (content === '' || content === 'none') {
			return undefined
		}

		return this.fromComputedStyle(style, {})
	}

	fromComputedStyleMap(style: StylePropertyMapReadOnly, defaults: Record<string, string>) {
		const styles: Record<string, string> = {}
		for (const property of style.keys()) {
			if (!shouldIncludeCssProperty(property)) continue

			const value = style.get(property)!.toString()
			if (defaults[property] === value) continue

			styles[property] = value
		}

		return styles
	}

	fromComputedStyle(style: CSSStyleDeclaration, defaults: Record<string, string>) {
		const styles: Record<string, string> = {}
		for (const property of style) {
			if (!shouldIncludeCssProperty(property)) continue

			const value = style.getPropertyValue(property)
			if (defaults[property] === value) {
				continue
			}

			styles[property] = value
		}
		return styles
	}
}

function formatCss(style: Record<string, string>) {
	let cssText = ''
	for (const [property, value] of Object.entries(style)) {
		cssText += `${property}: ${value};`
	}
	return cssText
}
