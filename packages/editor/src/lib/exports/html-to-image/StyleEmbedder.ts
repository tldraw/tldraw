import { assertExists, objectMapValues, uniqueId } from '@tldraw/utils'
import { FontEmbedder } from './FontEmbedder'
import { resourceToDataUrl } from './fetchCache'
import { isPropertyInherited, parseCssValueUrls, shouldIncludeCssProperty } from './parseCss'

type Styles = { [K in string]?: string }
type ReadonlyStyles = { readonly [K in string]?: string }
const NO_STYLES = {} as const

interface ElementStyleInfo {
	self: Styles
	before: Styles | undefined
	after: Styles | undefined
}

export class StyleEmbedder {
	constructor(private readonly root: Element) {}
	private readonly styles = new Map<HTMLElement, ElementStyleInfo>()
	private readonly fonts = new FontEmbedder()

	readRoot(rootElement: HTMLElement) {
		// when reading a root, we always apply _all_ the styles, even if they match the defaults
		this.readElement(rootElement, {
			shouldRespectDefaults: false,
			shouldSkipInheritedParentStyles: false,
		})

		const children = Array.from(rootElement.children) as HTMLElement[]
		while (children.length) {
			const child = children.pop()!
			this.readElement(child, {
				shouldRespectDefaults: true,
				shouldSkipInheritedParentStyles: true,
			})
			children.push(...(Array.from(child.children) as HTMLElement[]))
		}
	}

	readElement(
		element: HTMLElement,
		{ shouldRespectDefaults = true, shouldSkipInheritedParentStyles = true }
	) {
		const defaultStyles = shouldRespectDefaults
			? getDefaultStylesForTagName(element.tagName.toLowerCase())
			: NO_STYLES

		const parentStyles = shouldSkipInheritedParentStyles
			? this.styles.get(element.parentElement as HTMLElement)?.self ?? NO_STYLES
			: NO_STYLES

		const info: ElementStyleInfo = {
			self: element.computedStyleMap
				? fromComputedStyleMap(element.computedStyleMap(), { defaultStyles, parentStyles })
				: fromComputedStyle(window.getComputedStyle(element), { defaultStyles, parentStyles }),

			before: this.getPseudoElementStyle(element, ':before'),
			after: this.getPseudoElementStyle(element, ':after'),
		}
		this.styles.set(element, info)
	}

	fetchResources() {
		const promises: Promise<void>[] = []

		for (const info of this.styles.values()) {
			for (const styles of objectMapValues(info)) {
				if (!styles) continue
				for (const [property, value] of Object.entries(styles)) {
					if (!value) continue
					if (property === 'font-family') {
						this.fonts.onFontFamilyValue(value)
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
				if (!value) continue
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

		return fromComputedStyle(style, { defaultStyles: NO_STYLES, parentStyles: NO_STYLES })
	}

	dispose() {
		destroyDefaultStyleFrame()
	}
}

interface ReadStyleOpts {
	defaultStyles: ReadonlyStyles
	parentStyles: ReadonlyStyles
}

function fromComputedStyleMap(
	style: StylePropertyMapReadOnly,
	{ defaultStyles, parentStyles }: ReadStyleOpts
) {
	const styles: Record<string, string> = {}
	for (const property of style.keys()) {
		if (!shouldIncludeCssProperty(property)) continue

		const value = style.get(property)!.toString()

		if (defaultStyles[property] === value) continue
		if (parentStyles[property] === value && isPropertyInherited(property)) continue

		styles[property] = value
	}

	return styles
}

function fromComputedStyle(
	style: CSSStyleDeclaration,
	{ defaultStyles, parentStyles }: ReadStyleOpts
) {
	const styles: Record<string, string> = {}
	for (const property of style) {
		if (!shouldIncludeCssProperty(property)) continue

		const value = style.getPropertyValue(property)

		if (defaultStyles[property] === value) continue
		if (parentStyles[property] === value && isPropertyInherited(property)) continue

		styles[property] = value
	}
	return styles
}

function formatCss(style: ReadonlyStyles) {
	let cssText = ''
	for (const [property, value] of Object.entries(style)) {
		cssText += `${property}: ${value};`
	}
	return cssText
}

let defaultStyleFrame:
	| { iframe: HTMLIFrameElement; foreignObject: SVGForeignObjectElement; document: Document }
	| undefined
const defaultStylesByTagName: Record<string, ReadonlyStyles> = {}
function getDefaultStyleFrame() {
	if (!defaultStyleFrame) {
		const frame = document.createElement('iframe')
		frame.inert = true
		frame.style.display = 'none'
		document.body.appendChild(frame)
		const frameDocument = assertExists(frame.contentDocument, 'frame must have a document')
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
		svg.appendChild(foreignObject)
		frameDocument.body.appendChild(svg)
		defaultStyleFrame = { iframe: frame, foreignObject, document: frameDocument }
	}
	return defaultStyleFrame
}

function destroyDefaultStyleFrame() {
	if (defaultStyleFrame) {
		document.body.removeChild(defaultStyleFrame.iframe)
		defaultStyleFrame = undefined
	}
}

const defaultStyleReadOptions: ReadStyleOpts = { defaultStyles: NO_STYLES, parentStyles: NO_STYLES }
function getDefaultStylesForTagName(tagName: string) {
	let existing = defaultStylesByTagName[tagName]
	if (!existing) {
		const { foreignObject, document } = getDefaultStyleFrame()
		const element = document.createElement(tagName)
		foreignObject.appendChild(element)
		existing = element.computedStyleMap
			? fromComputedStyleMap(element.computedStyleMap(), defaultStyleReadOptions)
			: fromComputedStyle(window.getComputedStyle(element), defaultStyleReadOptions)
		foreignObject.removeChild(element)
		defaultStylesByTagName[tagName] = existing
	}
	return existing
}
