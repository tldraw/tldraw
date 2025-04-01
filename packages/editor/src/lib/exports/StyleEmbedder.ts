import { assert, getOwnProperty, objectMapValues, uniqueId } from '@tldraw/utils'
import { FontEmbedder } from './FontEmbedder'
import {
	elementStyle,
	getComputedStyle,
	getRenderedChildNodes,
	getRenderedChildren,
} from './domUtils'
import { resourceToDataUrl } from './fetchCache'
import { parseCssValueUrls, shouldIncludeCssProperty } from './parseCss'

type Styles = { [K in string]?: string }
type ReadonlyStyles = { readonly [K in string]?: string }
const NO_STYLES = {} as const

interface ElementStyleInfo {
	self: Styles
	before: Styles | undefined
	after: Styles | undefined
}

type CanSkipRule = (
	value: string,
	property: string,
	options: {
		styles: StylePropertyMapReadOnly | CSSStyleDeclaration
		parentStyles: ReadonlyStyles
		defaultStyles: ReadonlyStyles
		currentColor: string
	}
) => boolean

const getStyle = (styles: StylePropertyMapReadOnly | CSSStyleDeclaration, property: string) => {
	if (styles instanceof CSSStyleDeclaration) {
		return styles.getPropertyValue(property)
	}
	return styles.get(property)?.toString()
}

const isCoveredByCurrentColor: CanSkipRule = (value, property, { currentColor }) => {
	return value === 'currentColor' || value === currentColor
}

const isInherited: CanSkipRule = (value, property, { parentStyles }) => {
	return parentStyles[property] === value
}

const isExcludedBorder =
	(borderDirection: string): CanSkipRule =>
	(value, property, { styles }) => {
		const borderWidth = getStyle(styles, `border-${borderDirection}-width`)
		const borderStyle = getStyle(styles, `border-${borderDirection}-style`)

		if (borderWidth === '0px') return true
		if (borderStyle === 'none') return true
		return false
	}

const rules = {
	// currentColor properties:
	'border-block-end-color': isCoveredByCurrentColor,
	'border-block-start-color': isCoveredByCurrentColor,
	'border-bottom-color': isCoveredByCurrentColor,
	'border-inline-end-color': isCoveredByCurrentColor,
	'border-inline-start-color': isCoveredByCurrentColor,
	'border-left-color': isCoveredByCurrentColor,
	'border-right-color': isCoveredByCurrentColor,
	'border-top-color': isCoveredByCurrentColor,
	'caret-color': isCoveredByCurrentColor,
	'column-rule-color': isCoveredByCurrentColor,
	'outline-color': isCoveredByCurrentColor,
	'text-decoration': (value, property, { currentColor }) => {
		return value === 'none solid currentColor' || value === 'none solid ' + currentColor
	},
	'text-decoration-color': isCoveredByCurrentColor,
	'text-emphasis-color': isCoveredByCurrentColor,

	// inherited properties:
	'border-collapse': isInherited,
	'border-spacing': isInherited,
	'caption-side': isInherited,
	// N.B. We shouldn't inherit 'color' because there's some UA styling, e.g. `mark` elements
	// 'color': isInherited,
	cursor: isInherited,
	direction: isInherited,
	'empty-cells': isInherited,
	'font-family': isInherited,
	'font-size': isInherited,
	'font-style': isInherited,
	'font-variant': isInherited,
	'font-weight': isInherited,
	'font-size-adjust': isInherited,
	'font-stretch': isInherited,
	font: isInherited,
	'letter-spacing': isInherited,
	'line-height': isInherited,
	'list-style-image': isInherited,
	'list-style-position': isInherited,
	'list-style-type': isInherited,
	'list-style': isInherited,
	orphans: isInherited,
	'overflow-wrap': isInherited,
	quotes: isInherited,
	'stroke-linecap': isInherited,
	'stroke-linejoin': isInherited,
	'tab-size': isInherited,
	'text-align': isInherited,
	'text-align-last': isInherited,
	'text-indent': isInherited,
	'text-justify': isInherited,
	'text-shadow': isInherited,
	'text-transform': isInherited,
	visibility: isInherited,
	'white-space': isInherited,
	'white-space-collapse': isInherited,
	widows: isInherited,
	'word-break': isInherited,
	'word-spacing': isInherited,
	'word-wrap': isInherited,

	// special border cases - we have a weird case (tailwind seems to trigger this) where all
	// border-styles sometimes get set to 'solid', but the border-width is 0 so they don't render.
	// but in SVGs, **sometimes**, the border-width defaults (i think from a UA style-sheet? but
	// honestly can't tell) to 1.5px so the border displays. we work around this by only including
	// border styles at all if both the border-width and border-style are set to something that
	// would show a border.
	'border-top': isExcludedBorder('top'),
	'border-right': isExcludedBorder('right'),
	'border-bottom': isExcludedBorder('bottom'),
	'border-left': isExcludedBorder('left'),
	'border-block-end': isExcludedBorder('block-end'),
	'border-block-start': isExcludedBorder('block-start'),
	'border-inline-end': isExcludedBorder('inline-end'),
	'border-inline-start': isExcludedBorder('inline-start'),
	'border-top-style': isExcludedBorder('top'),
	'border-right-style': isExcludedBorder('right'),
	'border-bottom-style': isExcludedBorder('bottom'),
	'border-left-style': isExcludedBorder('left'),
	'border-block-end-style': isExcludedBorder('block-end'),
	'border-block-start-style': isExcludedBorder('block-start'),
	'border-inline-end-style': isExcludedBorder('inline-end'),
	'border-inline-start-style': isExcludedBorder('inline-start'),
	'border-top-width': isExcludedBorder('top'),
	'border-right-width': isExcludedBorder('right'),
	'border-bottom-width': isExcludedBorder('bottom'),
	'border-left-width': isExcludedBorder('left'),
	'border-block-end-width': isExcludedBorder('block-end'),
	'border-block-start-width': isExcludedBorder('block-start'),
	'border-inline-end-width': isExcludedBorder('inline-end'),
} satisfies Record<string, CanSkipRule>

export class StyleEmbedder {
	constructor(private readonly root: Element) {}
	private readonly styles = new Map<Element, ElementStyleInfo>()
	readonly fonts = new FontEmbedder()

	async collectDefaultStyles(elements: Element[]) {
		const collected = new Set<string>()
		const promises = []
		for (const element of elements) {
			const tagName = element.tagName.toLowerCase()
			if (collected.has(tagName)) continue
			collected.add(tagName)
			promises.push(populateDefaultStylesForTagName(tagName))
		}
		await Promise.all(promises)
	}

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
	const ruleOptions = { currentColor, parentStyles, defaultStyles, styles: style }
	for (const property of style.keys()) {
		if (!shouldIncludeCssProperty(property)) continue

		const value = style.get(property)!.toString()

		if (defaultStyles[property] === value) continue

		const rule = getOwnProperty(rules, property)
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
	const ruleOptions = { currentColor, parentStyles, defaultStyles, styles: style }

	for (const property in style) {
		if (!shouldIncludeCssProperty(property)) continue

		const value = style.getPropertyValue(property)

		if (defaultStyles[property] === value) continue

		const rule = getOwnProperty(rules, property)
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
	| Promise<{
			iframe: HTMLIFrameElement
			foreignObject: SVGForeignObjectElement
			document: Document
	  }>
	| undefined

const defaultStylesByTagName: Record<
	string,
	| { type: 'resolved'; styles: ReadonlyStyles; promise: Promise<ReadonlyStyles> }
	| { type: 'pending'; promise: Promise<ReadonlyStyles> }
> = {}

const emptyFrameBlob = new Blob(
	['<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>'],
	{ type: 'image/svg+xml' }
)
const emptyFrameUrl = URL.createObjectURL(emptyFrameBlob)

function getDefaultStyleFrame() {
	if (!defaultStyleFrame) {
		defaultStyleFrame = new Promise((resolve) => {
			const frame = document.createElement('iframe')
			Object.assign(frame.style, {
				position: 'absolute',
				top: '-10000px',
				left: '-10000px',
				width: '1px',
				height: '1px',
				opacity: '0',
				pointerEvents: 'none',
			})

			frame.onload = () => {
				const contentDocument = frame.contentDocument!
				const foreignObject = contentDocument.querySelector('foreignObject')!
				resolve({ iframe: frame, foreignObject, document: contentDocument })
			}

			frame.src = emptyFrameUrl
			document.body.appendChild(frame)
		})
	}
	return defaultStyleFrame
}

function destroyDefaultStyleFrame() {
	if (defaultStyleFrame) {
		defaultStyleFrame.then(({ iframe }) => document.body.removeChild(iframe))
		defaultStyleFrame = undefined
	}
}

const defaultStyleReadOptions: ReadStyleOpts = { defaultStyles: NO_STYLES, parentStyles: NO_STYLES }
function populateDefaultStylesForTagName(tagName: string) {
	const existing = defaultStylesByTagName[tagName]
	if (existing && existing.type === 'resolved') {
		return existing.promise
	}

	if (existing && existing.type === 'pending') {
		return existing.promise
	}

	const promise = getDefaultStyleFrame().then(({ foreignObject, document }) => {
		const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
		element.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
		foreignObject.appendChild(element)
		const styles = element.computedStyleMap
			? styleFromComputedStyleMap(element.computedStyleMap(), defaultStyleReadOptions)
			: styleFromComputedStyle(getComputedStyle(element), defaultStyleReadOptions)
		foreignObject.removeChild(element)
		defaultStylesByTagName[tagName] = { type: 'resolved', styles, promise }
		return styles
	})

	defaultStylesByTagName[tagName] = { type: 'pending', promise }
	return promise
}

function getDefaultStylesForTagName(tagName: string) {
	const existing = defaultStylesByTagName[tagName]
	assert(existing && existing.type === 'resolved', 'default styles must be populated & resolved')
	return existing.styles
}
