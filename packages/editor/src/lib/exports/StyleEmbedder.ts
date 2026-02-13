import { assertExists, getOwnProperty, objectMapValues, uniqueId } from '@tldraw/utils'
import { FontEmbedder } from './FontEmbedder'
import { ReadonlyStyles, Styles, cssRules } from './cssRules'
import {
	elementStyle,
	getComputedStyle,
	getRenderedChildNodes,
	getRenderedChildren,
} from './domUtils'
import { resourceToDataUrl } from './fetchCache'
import { parseCssValueUrls, shouldIncludeCssProperty } from './parseCss'

const NO_STYLES = {} as const

interface ElementStyleInfo {
	self: Styles
	before: Styles | undefined
	after: Styles | undefined
}

export class StyleEmbedder {
	constructor(private readonly root: Element) {}
	private readonly styles = new Map<Element, ElementStyleInfo>()
	readonly fonts = new FontEmbedder()

	readRootElementStyles(rootElement: Element) {
		// when reading a root, we always apply _all_ the styles, even if they match the defaults
		this.readElementStyles(rootElement, {
			shouldRespectDefaults: false,
			shouldSkipInheritedParentStyles: false,
		})

		const children = Array.from(getRenderedChildren(rootElement))
		while (children.length) {
			const child = children.pop()!
			children.push(...getRenderedChildren(child))

			// when reading children, we don't apply styles that match the defaults for that
			// element, or that would be inherited from the parent
			this.readElementStyles(child, {
				shouldRespectDefaults: true,
				shouldSkipInheritedParentStyles: true,
			})
		}
	}

	private readElementStyles(
		element: Element,
		{ shouldRespectDefaults = true, shouldSkipInheritedParentStyles = true }
	) {
		const defaultStyles = shouldRespectDefaults
			? getDefaultStylesForTagName(element.tagName.toLowerCase())
			: NO_STYLES

		const parentStyles = Object.assign({}, NO_STYLES) as Styles
		if (shouldSkipInheritedParentStyles) {
			let el = element.parentElement
			// Keep going up the tree to find all the relevant styles
			while (el) {
				const currentStyles = this.styles.get(el)?.self
				for (const style in currentStyles) {
					if (!parentStyles[style]) {
						parentStyles[style] = currentStyles[style]
					}
				}
				el = el.parentElement
			}
		}

		const info: ElementStyleInfo = {
			self: styleFromElement(element, { defaultStyles, parentStyles }),
			before: styleFromPseudoElement(element, '::before'),
			after: styleFromPseudoElement(element, '::after'),
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

	// custom elements are tricky. if we serialize the dom as-is, the custom elements wont have
	// their shadow-dom contents serialized. after we've read all the styles, we need to unwrap the
	// contents of each custom elements shadow dom directly into the parent element itself.
	unwrapCustomElements() {
		const visited = new Set<Node>()

		const visit = (element: Element, clonedParent: Element | null) => {
			if (visited.has(element)) return
			visited.add(element)

			const shadowRoot = element.shadowRoot

			if (shadowRoot) {
				const clonedCustomEl = document.createElement('div')
				this.styles.set(clonedCustomEl, this.styles.get(element)!)

				clonedCustomEl.setAttribute('data-tl-custom-element', element.tagName)
				;(clonedParent ?? element.parentElement!).appendChild(clonedCustomEl)

				for (const child of shadowRoot.childNodes) {
					if (child instanceof Element) {
						visit(child, clonedCustomEl)
					} else {
						clonedCustomEl.appendChild(child.cloneNode(true))
					}
				}

				element.remove()
			} else if (clonedParent) {
				if (element.tagName.toLowerCase() === 'style') {
					// we don't clone style tags at that would break the style scoping. instead we
					// rely on the computed styles we've already read
					return
				}

				const clonedEl = element.cloneNode(false) as Element
				this.styles.set(clonedEl, this.styles.get(element)!)

				clonedParent.appendChild(clonedEl)

				for (const child of getRenderedChildNodes(element)) {
					if (child instanceof Element) {
						visit(child, clonedEl)
					} else {
						clonedEl.appendChild(child.cloneNode(true))
					}
				}
			}
		}

		for (const element of this.styles.keys()) {
			visit(element, null)
		}
	}

	embedStyles(): string {
		let css = ''

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

			const style = elementStyle(element)
			for (const [property, value] of Object.entries(info.self)) {
				if (!value) continue
				style.setProperty(property, value)
			}

			// in HTML, font-kerning: auto is equivalent to font-kerning: normal. But in SVG, it's
			// none. We set it to normal here to match the HTML behavior, as otherwise this can
			// cause rendering differences.
			if (style.fontKerning === 'auto') {
				style.fontKerning = 'normal'
			}
		}

		return css
	}

	async getFontFaceCss() {
		return await this.fonts.createCss()
	}

	dispose() {
		destroyDefaultStyleFrame()
	}
}

interface ReadStyleOpts {
	defaultStyles: ReadonlyStyles
	parentStyles: ReadonlyStyles
}

function styleFromElement(element: Element, { defaultStyles, parentStyles }: ReadStyleOpts) {
	// `computedStyleMap` produces a more accurate representation of the styles, but it's not
	// supported in firefox at the time of writing. So we fall back to `getComputedStyle` if it's
	// not available.
	if (element.computedStyleMap) {
		return styleFromComputedStyleMap(element.computedStyleMap(), { defaultStyles, parentStyles })
	}
	return styleFromComputedStyle(getComputedStyle(element), { defaultStyles, parentStyles })
}

function styleFromPseudoElement(element: Element, pseudo: string) {
	// the equivalent of `computedStyleMap` for pseudo-elements isn't even fully specced out yet, so
	// for those we have to use `getComputedStyle` in all browsers.
	const style = getComputedStyle(element, pseudo)

	const content = style.getPropertyValue('content')
	if (content === '' || content === 'none') {
		return undefined
	}

	return styleFromComputedStyle(style, { defaultStyles: NO_STYLES, parentStyles: NO_STYLES })
}

function styleFromComputedStyleMap(
	style: StylePropertyMapReadOnly,
	{ defaultStyles, parentStyles }: ReadStyleOpts
) {
	const styles: Record<string, string> = {}
	const currentColor = style.get('color')?.toString() || ''
	const ruleOptions = {
		currentColor,
		parentStyles,
		defaultStyles,
		getStyle: (property: string) => style.get(property)?.toString() ?? '',
	}
	for (const property of style.keys()) {
		if (!shouldIncludeCssProperty(property)) continue

		const value = style.get(property)!.toString()

		if (defaultStyles[property] === value) continue

		const rule = getOwnProperty(cssRules, property)
		if (rule && rule(value, property, ruleOptions)) continue

		styles[property] = value
	}

	return styles
}

function styleFromComputedStyle(
	style: CSSStyleDeclaration,
	{ defaultStyles, parentStyles }: ReadStyleOpts
) {
	const styles: Record<string, string> = {}
	const currentColor = style.color
	const ruleOptions = {
		currentColor,
		parentStyles,
		defaultStyles,
		getStyle: (property: string) => style.getPropertyValue(property),
	}

	for (const property in style) {
		if (!shouldIncludeCssProperty(property)) continue

		const value = style.getPropertyValue(property)

		if (defaultStyles[property] === value) continue

		const rule = getOwnProperty(cssRules, property)
		if (rule && rule(value, property, ruleOptions)) continue

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

// when we're figuring out the default values for a tag, we need read them from a separate document
// so they're not affected by the current document's styles
let defaultStyleFrame:
	| { iframe: HTMLIFrameElement; foreignObject: SVGForeignObjectElement; document: Document }
	| undefined
const defaultStylesByTagName: Record<string, ReadonlyStyles> = {}
function getDefaultStyleFrame() {
	if (!defaultStyleFrame) {
		const frame = document.createElement('iframe')
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
			? styleFromComputedStyleMap(element.computedStyleMap(), defaultStyleReadOptions)
			: styleFromComputedStyle(getComputedStyle(element), defaultStyleReadOptions)
		foreignObject.removeChild(element)
		defaultStylesByTagName[tagName] = existing
	}
	return existing
}
