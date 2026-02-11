/*!
 * SVG sanitizer based on DOMPurify's allowed SVG tags, attributes, and filter profiles.
 * MIT License: https://github.com/cure53/DOMPurify/blob/main/LICENSE
 * Copyright (c) 2015 Mario Heiderich
 */

// Allowed SVG element names (lowercase for comparison).
// Based on DOMPurify's SVG + SVG filter profiles, plus 'use'.
// Note: <style> is intentionally excluded — sanitizing CSS in style blocks is
// error-prone (CSS escape sequences can bypass regex filters), so like DOMPurify
// we remove <style> elements entirely. Inline style= attributes are still
// allowed and sanitized via decodeCssEscapes + sanitizeCss.
const ALLOWED_TAGS = new Set([
	// SVG elements
	'svg',
	'a',
	'altglyph',
	'altglyphdef',
	'altglyphitem',
	'animatecolor',
	'animatemotion',
	'animatetransform',
	'circle',
	'clippath',
	'defs',
	'desc',
	'ellipse',
	'filter',
	'font',
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
	'stop',
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
	// SVG filter elements
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
])

// Allowed SVG attribute names (lowercase for comparison).
// Based on DOMPurify's SVG attribute profile + XML namespace attributes.
const ALLOWED_ATTRS = new Set([
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
	'clippathunits',
	'clip-path',
	'clip-rule',
	'color',
	'color-interpolation',
	'color-interpolation-filters',
	'color-profile',
	'color-rendering',
	'cx',
	'cy',
	'd',
	'dx',
	'dy',
	'diffuseconstant',
	'direction',
	'display',
	'divisor',
	'dur',
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
	'fx',
	'fy',
	'g1',
	'g2',
	'glyph-name',
	'glyphref',
	'gradientunits',
	'gradienttransform',
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
	'keypoints',
	'keysplines',
	'keytimes',
	'lang',
	'lengthadjust',
	'letter-spacing',
	'kernelmatrix',
	'kernelunitlength',
	'lighting-color',
	'local',
	'marker-end',
	'marker-mid',
	'marker-start',
	'markerheight',
	'markerunits',
	'markerwidth',
	'maskcontentunits',
	'maskunits',
	'max',
	'mask',
	'mask-type',
	'media',
	'method',
	'mode',
	'min',
	'name',
	'numoctaves',
	'offset',
	'operator',
	'opacity',
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
	'points',
	'preservealpha',
	'preserveaspectratio',
	'primitiveunits',
	'r',
	'rx',
	'ry',
	'radius',
	'refx',
	'refy',
	'repeatcount',
	'repeatdur',
	'restart',
	'result',
	'rotate',
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
	'stroke-dasharray',
	'stroke-dashoffset',
	'stroke-linecap',
	'stroke-linejoin',
	'stroke-miterlimit',
	'stroke-opacity',
	'stroke',
	'stroke-width',
	'style',
	'surfacescale',
	'systemlanguage',
	'tabindex',
	'tablevalues',
	'targetx',
	'targety',
	'transform',
	'transform-origin',
	'text-anchor',
	'text-decoration',
	'text-rendering',
	'textlength',
	'type',
	'u1',
	'u2',
	'unicode',
	'values',
	'viewbox',
	'visibility',
	'version',
	'vert-adv-y',
	'vert-origin-x',
	'vert-origin-y',
	'width',
	'word-spacing',
	'wrap',
	'writing-mode',
	'xchannelselector',
	'ychannelselector',
	'x',
	'x1',
	'x2',
	'xmlns',
	'y',
	'y1',
	'y2',
	'z',
	'zoomandpan',
	// XML namespace attributes
	'xlink:href',
	'xml:id',
	'xlink:title',
	'xml:space',
	'xmlns:xlink',
])

// Attributes that contain URIs and need protocol validation.
const URI_ATTRS = new Set(['href', 'xlink:href'])

// Matches CSS url() declarations that could exfiltrate data or load external resources.
const CSS_URL = /url\s*\(.*?\)/gi
// Matches CSS @import rules that could load external stylesheets.
const CSS_IMPORT = /@import\b[^;]*;?/gi

// Blocks javascript:, vbscript:, data:, etc.
const IS_SCRIPT_OR_DATA = /^(?:\w+script|data):/i

// Strips invisible whitespace that could be used to bypass protocol checks.
// eslint-disable-next-line no-control-regex
const ATTR_WHITESPACE = /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g

/** @internal */
export function defaultSanitizeSvg(svgText: string): string {
	const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')

	// Check for parse errors
	const parseError = doc.querySelector('parsererror')
	if (parseError) return ''

	const svg = doc.documentElement
	sanitizeAttributes(svg)
	sanitizeNode(svg)

	// If sanitization stripped all children, the SVG has no safe content.
	if (svg.children.length === 0) return ''

	return new XMLSerializer().serializeToString(svg)
}

function sanitizeNode(node: Element): void {
	// Walk children in reverse so removals don't shift indices
	for (let i = node.children.length - 1; i >= 0; i--) {
		const child = node.children[i]
		if (!ALLOWED_TAGS.has(child.tagName.toLowerCase())) {
			child.remove()
		} else {
			sanitizeAttributes(child)
			sanitizeNode(child)
		}
	}
}

function decodeCssEscapes(css: string): string {
	return css.replace(/\\([0-9a-fA-F]{1,6})\s?|\\([^\n])/g, (_, hex, literal) => {
		if (hex) return String.fromCodePoint(parseInt(hex, 16))
		return literal
	})
}

function sanitizeCss(css: string): string {
	const decoded = decodeCssEscapes(css)
	return decoded.replace(CSS_URL, '').replace(CSS_IMPORT, '')
}

function sanitizeAttributes(el: Element): void {
	for (let i = el.attributes.length - 1; i >= 0; i--) {
		const attr = el.attributes[i]
		const name = attr.name.toLowerCase()

		if (!ALLOWED_ATTRS.has(name)) {
			el.removeAttribute(attr.name)
			continue
		}

		if (URI_ATTRS.has(name)) {
			const val = attr.value.replace(ATTR_WHITESPACE, '')
			if (IS_SCRIPT_OR_DATA.test(val)) {
				el.removeAttribute(attr.name)
			}
		}

		if (name === 'style') {
			attr.value = sanitizeCss(attr.value)
		}
	}
}
