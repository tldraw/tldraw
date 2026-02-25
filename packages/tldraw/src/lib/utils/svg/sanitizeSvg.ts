/*!
 * SVG/attribute allowlists and URI sanitization approach derived from DOMPurify.
 * DOMPurify — MIT License, Copyright (c) 2015 Mario Heiderich
 * https://github.com/cure53/DOMPurify/blob/main/LICENSE
 */

// --- Allowed SVG elements (lowercase) ---
// Includes foreignObject, style, and animation elements.
const ALLOWED_SVG_TAGS = new Set([
	'svg',
	'a',
	'altglyph',
	'altglyphdef',
	'altglyphitem',
	'animate',
	'animatecolor',
	'animatemotion',
	'animatetransform',
	'circle',
	'clippath',
	'defs',
	'desc',
	'ellipse',
	'feblend',
	'fecolormatrix',
	'fecomponenttransfer',
	'fecomposite',
	'feconvolvematrix',
	'fediffuselighting',
	'fedisplacementmap',
	'fedistantlight',
	'fedropshadow',
	'feflood',
	'fefunca',
	'fefuncb',
	'fefuncg',
	'fefuncr',
	'fegaussianblur',
	'feimage',
	'femerge',
	'femergenode',
	'femorphology',
	'feoffset',
	'fepointlight',
	'fespecularlighting',
	'fespotlight',
	'fetile',
	'feturbulence',
	'filter',
	'font',
	'foreignobject',
	'g',
	'glyph',
	'glyphref',
	'hkern',
	'image',
	'line',
	'lineargradient',
	'marker',
	'mask',
	'metadata',
	'mpath',
	'path',
	'pattern',
	'polygon',
	'polyline',
	'radialgradient',
	'rect',
	'set',
	'stop',
	'style',
	'switch',
	'symbol',
	'text',
	'textpath',
	'title',
	'tref',
	'tspan',
	'use',
	'view',
	'vkern',
])

// --- Allowed HTML elements inside foreignObject ---
const ALLOWED_HTML_TAGS = new Set([
	'a',
	'b',
	'blockquote',
	'body',
	'br',
	'code',
	'del',
	'div',
	'em',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'i',
	'li',
	'mark',
	'ol',
	'p',
	'pre',
	'span',
	'strong',
	's',
	'sub',
	'sup',
	'table',
	'tbody',
	'td',
	'th',
	'thead',
	'tr',
	'u',
	'ul',
])

// --- Blocked HTML elements inside foreignObject ---
// These are explicitly dangerous even if not in the allow list (defense in depth).
const BLOCKED_HTML_TAGS = new Set([
	'script',
	'iframe',
	'object',
	'embed',
	'form',
	'input',
	'textarea',
	'select',
	'button',
	'link',
	'meta',
	'base',
	'img', // onerror vector
	'video',
	'audio',
	'source',
	'picture',
	'svg', // no nested SVG inside foreignObject
])

// --- Allowed SVG attributes (lowercase) ---
const ALLOWED_SVG_ATTRS = new Set([
	'accent-height',
	'accumulate',
	'additive',
	'alignment-baseline',
	'amplitude',
	'ascent',
	'attributename',
	'attributetype',
	'azimuth',
	'basefrequency',
	'baseline-shift',
	'begin',
	'bias',
	'by',
	'class',
	'clip',
	'clip-path',
	'clip-rule',
	'clippathunits',
	'color',
	'color-interpolation',
	'color-interpolation-filters',
	'color-profile',
	'color-rendering',
	'cx',
	'cy',
	'd',
	'diffuseconstant',
	'direction',
	'display',
	'divisor',
	'dominant-baseline',
	'dur',
	'dx',
	'dy',
	'edgemode',
	'elevation',
	'end',
	'exponent',
	'fill',
	'fill-opacity',
	'fill-rule',
	'filter',
	'filterunits',
	'flood-color',
	'flood-opacity',
	'font-family',
	'font-size',
	'font-size-adjust',
	'font-stretch',
	'font-style',
	'font-variant',
	'font-weight',
	'from',
	'fx',
	'fy',
	'g1',
	'g2',
	'glyph-name',
	'glyphref',
	'gradienttransform',
	'gradientunits',
	'height',
	'href',
	'id',
	'image-rendering',
	'in',
	'in2',
	'intercept',
	'k',
	'k1',
	'k2',
	'k3',
	'k4',
	'kerning',
	'kernelmatrix',
	'kernelunitlength',
	'keypoints',
	'keysplines',
	'keytimes',
	'lang',
	'lengthadjust',
	'letter-spacing',
	'lighting-color',
	'local',
	'marker-end',
	'marker-mid',
	'marker-start',
	'markerheight',
	'markerunits',
	'markerwidth',
	'mask',
	'mask-type',
	'maskcontentunits',
	'maskunits',
	'max',
	'media',
	'method',
	'min',
	'mode',
	'name',
	'numoctaves',
	'offset',
	'opacity',
	'operator',
	'order',
	'orient',
	'orientation',
	'origin',
	'overflow',
	'paint-order',
	'path',
	'pathlength',
	'patterncontentunits',
	'patterntransform',
	'patternunits',
	'pointer-events',
	'points',
	'preservealpha',
	'preserveaspectratio',
	'primitiveunits',
	'r',
	'radius',
	'refx',
	'refy',
	'repeatcount',
	'repeatdur',
	'requiredfeatures',
	'restart',
	'result',
	'role',
	'rotate',
	'rx',
	'ry',
	'scale',
	'seed',
	'shape-rendering',
	'slope',
	'specularconstant',
	'specularexponent',
	'spreadmethod',
	'startoffset',
	'stddeviation',
	'stitchtiles',
	'stop-color',
	'stop-opacity',
	'stroke',
	'stroke-dasharray',
	'stroke-dashoffset',
	'stroke-linecap',
	'stroke-linejoin',
	'stroke-miterlimit',
	'stroke-opacity',
	'stroke-width',
	'style',
	'surfacescale',
	'systemlanguage',
	'tabindex',
	'tablevalues',
	'targetx',
	'targety',
	'text-anchor',
	'text-decoration',
	'text-rendering',
	'textlength',
	'to',
	'transform',
	'transform-origin',
	'type',
	'u1',
	'u2',
	'unicode',
	'values',
	'version',
	'vert-adv-y',
	'vert-origin-x',
	'vert-origin-y',
	'viewbox',
	'visibility',
	'width',
	'word-spacing',
	'wrap',
	'writing-mode',
	'x',
	'x1',
	'x2',
	'xchannelselector',
	'xlink:href',
	'xml:id',
	'xml:space',
	'xlink:title',
	'xmlns',
	'xmlns:xlink',
	'y',
	'y1',
	'y2',
	'z',
	'zoomandpan',
])

// --- Allowed HTML attributes inside foreignObject ---
const ALLOWED_HTML_ATTRS = new Set([
	'class',
	'dir',
	'href', // only on <a>
	'id',
	'lang',
	'role',
	'style',
	'tabindex',
	'title',
])

// Patterns for data-* and aria-* attributes
const DATA_ATTR_PATTERN = /^data-/
const ARIA_ATTR_PATTERN = /^aria-/

// --- URI sanitization ---
// Strip invisible whitespace that can bypass protocol checks
// eslint-disable-next-line no-control-regex
const INVISIBLE_WHITESPACE = /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g

// Safe link protocols
const SAFE_LINK_PROTOCOLS = /^(?:https?:|mailto:)/i

// data: URI (for images, fonts)
const DATA_URI = /^data:/i

// data: URI restricted to raster image formats (no svg+xml — could embed unsanitized SVG)
const RASTER_DATA_URI =
	/^data:image\/(?:png|jpeg|jpg|gif|webp|avif|bmp|tiff|x-icon|vnd\.microsoft\.icon)[;,]/i

// Fragment-only ref (#id)
const FRAGMENT_REF = /^#/

// --- CSS sanitization ---

function decodeCssEscapes(css: string): string {
	return css.replace(/\\([0-9a-fA-F]{1,6})\s?|\\([^\n])/g, (_, hex, literal) => {
		if (hex) {
			const codePoint = parseInt(hex, 16)
			if (codePoint > 0x10ffff || codePoint === 0) return '\uFFFD'
			return String.fromCodePoint(codePoint)
		}
		return literal
	})
}

// Allowed data: MIME types in CSS url()
const SAFE_CSS_DATA_MIME =
	/^data:(?:image\/(?:png|jpeg|jpg|gif|webp|avif)|font\/(?:woff2?|opentype|truetype|sfnt)|application\/(?:x-font-woff|font-woff2?|x-font-ttf|x-font-opentype|font-sfnt))[;,]/i

function sanitizeCssValue(css: string): string {
	let decoded = decodeCssEscapes(css)
	// Strip @import — handle url() with semicolons inside quotes
	decoded = decoded.replace(
		/@import\s+(?:url\s*\([^)]*\)|"[^"]*"|'[^']*')[^;]*;?|@import\b[^;]*;?/gi,
		''
	)
	// Strip expression(), -moz-binding, behavior:
	decoded = decoded.replace(/expression\s*\([^)]*\)/gi, '')
	decoded = decoded.replace(/-moz-binding\s*:[^;]*/gi, '')
	decoded = decoded.replace(/behavior\s*:[^;]*/gi, '')
	// Sanitize url() — allow only data: with safe MIME types
	decoded = decoded.replace(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gis, (match, _quote, uri) => {
		const stripped = uri.replace(INVISIBLE_WHITESPACE, '')
		if (SAFE_CSS_DATA_MIME.test(stripped) || FRAGMENT_REF.test(stripped)) {
			return match
		}
		return ''
	})
	return decoded
}

function sanitizeStyleElement(textContent: string): string {
	return sanitizeCssValue(textContent)
}

// --- Animation safety ---
// Animation elements (<animate>, <set>) can overwrite attributes at runtime.
// If attributeName targets a URI attr (href) or event handler (on*), the animation
// can inject javascript: URIs or re-add stripped handlers, bypassing static sanitization.
const ANIMATION_TAGS = new Set(['animate', 'set', 'animatecolor', 'animatetransform'])
const DANGEROUS_ANIMATION_TARGETS = /^(?:href|xlink:href|on)/i

function isAnimationDangerous(el: Element): boolean {
	const attrName = el.getAttribute('attributeName')
	if (!attrName) return false
	return DANGEROUS_ANIMATION_TARGETS.test(attrName.replace(INVISIBLE_WHITESPACE, ''))
}

// --- Event handler detection ---
// Matches on* after normalizing invisible chars — catches all current and future event handlers
const EVENT_HANDLER_PATTERN = /^on/i

// --- SVG presentation attributes that accept url() references ---
// These can exfiltrate data via external URL loads if not sanitized.
const URL_BEARING_SVG_ATTRS = new Set([
	'clip-path',
	'cursor',
	'fill',
	'filter',
	'marker-end',
	'marker-mid',
	'marker-start',
	'mask',
	'stroke',
])

// --- Node sanitization ---

type SanitizeMode = 'svg' | 'html'

function sanitizeUri(el: Element, attrName: string, value: string): string | null {
	const stripped = value.replace(INVISIBLE_WHITESPACE, '')
	const tagName = el.tagName.toLowerCase()

	// <image> and <feImage>: raster data: only (no svg+xml — could embed unsanitized SVG)
	if (tagName === 'image' || tagName === 'feimage') {
		if (RASTER_DATA_URI.test(stripped)) return value
		return null
	}

	// <use>: fragment-only (#id)
	if (tagName === 'use') {
		if (FRAGMENT_REF.test(stripped)) return value
		return null
	}

	// <a>: http, https, mailto only
	if (tagName === 'a') {
		if (SAFE_LINK_PROTOCOLS.test(stripped)) return value
		return null
	}

	// All other elements with href/xlink:href: data: or fragment
	if (DATA_URI.test(stripped) || FRAGMENT_REF.test(stripped)) return value
	return null
}

function sanitizeSvgAttributes(el: Element): void {
	for (let i = el.attributes.length - 1; i >= 0; i--) {
		const attr = el.attributes[i]
		const name = attr.name.toLowerCase()

		// Strip ALL event handlers (on*)
		const normalized = name.replace(INVISIBLE_WHITESPACE, '')
		if (EVENT_HANDLER_PATTERN.test(normalized)) {
			el.removeAttribute(attr.name)
			continue
		}

		// Allow data-* and aria-*
		if (DATA_ATTR_PATTERN.test(name) || ARIA_ATTR_PATTERN.test(name)) {
			continue
		}

		if (!ALLOWED_SVG_ATTRS.has(name)) {
			el.removeAttribute(attr.name)
			continue
		}

		// URI attributes need context-dependent sanitization
		if (name === 'href' || name === 'xlink:href') {
			const sanitized = sanitizeUri(el, name, attr.value)
			if (sanitized === null) {
				el.removeAttribute(attr.name)
			}
			continue
		}

		// style attribute: sanitize CSS
		if (name === 'style') {
			attr.value = sanitizeCssValue(attr.value)
			continue
		}

		// Presentation attributes that accept url() references — sanitize to allow
		// only data: (safe MIME) and fragment (#id) refs, strip external URLs
		if (URL_BEARING_SVG_ATTRS.has(name) && /url\s*\(/i.test(attr.value)) {
			attr.value = sanitizeCssValue(attr.value)
		}
	}
}

function sanitizeHtmlAttributes(el: Element): void {
	const tagName = el.tagName.toLowerCase()

	for (let i = el.attributes.length - 1; i >= 0; i--) {
		const attr = el.attributes[i]
		const name = attr.name.toLowerCase()

		// Strip ALL event handlers
		const normalized = name.replace(INVISIBLE_WHITESPACE, '')
		if (EVENT_HANDLER_PATTERN.test(normalized)) {
			el.removeAttribute(attr.name)
			continue
		}

		// Allow data-* and aria-*
		if (DATA_ATTR_PATTERN.test(name) || ARIA_ATTR_PATTERN.test(name)) {
			continue
		}

		if (!ALLOWED_HTML_ATTRS.has(name)) {
			el.removeAttribute(attr.name)
			continue
		}

		// href only allowed on <a>, with safe protocols only
		if (name === 'href') {
			if (tagName !== 'a') {
				el.removeAttribute(attr.name)
				continue
			}
			const stripped = attr.value.replace(INVISIBLE_WHITESPACE, '')
			if (!SAFE_LINK_PROTOCOLS.test(stripped)) {
				el.removeAttribute(attr.name)
			}
			continue
		}

		// style attribute: sanitize CSS
		if (name === 'style') {
			attr.value = sanitizeCssValue(attr.value)
		}
	}
}

function sanitizeNode(node: Element, mode: SanitizeMode): void {
	// Walk children in reverse so removals don't shift indices
	for (let i = node.children.length - 1; i >= 0; i--) {
		const child = node.children[i]
		const tag = child.tagName.toLowerCase()

		if (mode === 'svg') {
			if (tag === 'foreignobject') {
				// foreignObject: sanitize attrs as SVG, recurse children as HTML
				sanitizeSvgAttributes(child)
				sanitizeNode(child, 'html')
			} else if (tag === 'style') {
				// <style>: sanitize attrs, sanitize text content as CSS
				sanitizeSvgAttributes(child)
				if (child.textContent) {
					child.textContent = sanitizeStyleElement(child.textContent)
				}
			} else if (ANIMATION_TAGS.has(tag) && isAnimationDangerous(child)) {
				// Animation targeting href/on* can inject javascript: URIs at runtime
				child.remove()
			} else if (ALLOWED_SVG_TAGS.has(tag)) {
				sanitizeSvgAttributes(child)
				sanitizeNode(child, 'svg')
			} else {
				child.remove()
			}
		} else {
			// HTML mode (inside foreignObject)
			if (BLOCKED_HTML_TAGS.has(tag)) {
				child.remove()
			} else if (ALLOWED_HTML_TAGS.has(tag)) {
				sanitizeHtmlAttributes(child)
				sanitizeNode(child, 'html')
			} else {
				child.remove()
			}
		}
	}
}

/**
 * Sanitizes an SVG string by removing dangerous elements, attributes, and URIs
 * while preserving safe content including foreignObject (for text rendering),
 * style elements (for fonts with data: URLs), and animation elements.
 *
 * Returns the sanitized SVG string, or an empty string if the input was
 * malformed (parse error) or contained no safe content after sanitization.
 *
 * @public
 */
export function sanitizeSvg(svgText: string): string {
	const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')

	// Check for parse errors
	const parseError = doc.querySelector('parsererror')
	if (parseError) return ''

	const svg = doc.documentElement
	if (svg.tagName.toLowerCase() !== 'svg') return ''

	sanitizeSvgAttributes(svg)
	sanitizeNode(svg, 'svg')

	// If sanitization stripped all children, the SVG has no safe content
	if (svg.children.length === 0) return ''

	return new XMLSerializer().serializeToString(svg)
}
