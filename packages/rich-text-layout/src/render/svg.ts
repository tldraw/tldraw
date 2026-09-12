import { Fragment, LineBox, MarkerSymbol, TextLayout } from '../layout/types'
import { ResolvedInlineStyle } from '../style/types'

/**
 * A renderer-neutral SVG element tree. Consumers that render with React or another DOM
 * builder walk this instead of parsing the string form.
 *
 * @public
 */
export interface SvgNode {
	tag: string
	attrs: Record<string, string | number>
	children: (SvgNode | string)[]
}

/** @public */
export interface SvgRenderOptions {
	/** Translate the whole layout. */
	x?: number
	y?: number
	/** Stroke painted behind the glyphs (`paint-order: stroke`), e.g. tldraw's text outline. */
	outline?: { color: string; width: number } | null
	/** Render inline backgrounds (highlights) as rects. Defaults to true. */
	backgrounds?: boolean
	/** Decimal places for coordinates. Defaults to 2. */
	precision?: number
	/** Attributes added to the root group. */
	attrs?: Record<string, string | number>
	/**
	 * Rewrite a font family before it is written out, e.g. to map a CSS alias onto the name a
	 * rasterizer knows the font by.
	 */
	fontFamily?(family: string): string
}

function num(value: number, precision: number) {
	const rounded = Number(value.toFixed(precision))
	return Object.is(rounded, -0) ? 0 : rounded
}

function styleAttrs(
	style: ResolvedInlineStyle,
	options: SvgRenderOptions
): Record<string, string | number> {
	const attrs: Record<string, string | number> = {
		'font-family': options.fontFamily ? options.fontFamily(style.fontFamily) : style.fontFamily,
		'font-size': num(style.fontSize, 2),
		fill: style.color,
	}
	if (style.fontWeight !== 'normal') attrs['font-weight'] = style.fontWeight
	if (style.fontStyle !== 'normal') attrs['font-style'] = style.fontStyle
	if (style.letterSpacing !== 0) attrs['letter-spacing'] = num(style.letterSpacing, 2)
	if (style.textDecoration !== 'none') attrs['text-decoration'] = style.textDecoration
	return attrs
}

/**
 * Spaces are merged into the preceding fragment of the same style so copy/paste from the SVG
 * keeps word boundaries, while every word keeps its own `x` so renderer advances can't drift.
 */
function mergeSpaces(fragments: Fragment[]): Fragment[] {
	const out: Fragment[] = []
	for (const f of fragments) {
		const prev = out[out.length - 1]
		if (
			f.kind === 'space' &&
			prev &&
			prev.kind !== 'tab' &&
			prev.kind !== 'marker' &&
			prev.style === f.style &&
			Math.abs(prev.x + prev.width - f.x) < 0.01
		) {
			out[out.length - 1] = { ...prev, text: prev.text + f.text, width: prev.width + f.width }
			continue
		}
		out.push(f)
	}
	return out
}

function renderLine(line: LineBox, options: SvgRenderOptions, precision: number): SvgNode[] {
	const dx = options.x ?? 0
	const dy = options.y ?? 0
	const nodes: SvgNode[] = []
	const baselineY = line.y + line.baseline + dy

	if (options.backgrounds !== false) {
		for (const f of line.fragments) {
			if (!f.style.background || f.kind === 'tab') continue
			nodes.push({
				tag: 'rect',
				attrs: {
					x: num(line.x + f.x + dx, precision),
					y: num(baselineY + f.baselineShift - f.ascent, precision),
					width: num(f.width, precision),
					height: num(f.ascent + f.descent, precision),
					fill: f.style.background,
				},
				children: [],
			})
		}
	}

	const tspans: SvgNode[] = []
	for (const f of mergeSpaces(line.fragments)) {
		if (f.kind === 'tab' || f.text.length === 0) continue
		if (f.kind === 'marker' && f.symbol) {
			nodes.push(symbolNode(f.symbol, line.x + dx, line.y + dy, f.style.color, precision))
			continue
		}
		const attrs: Record<string, string | number> = {
			x: num(line.x + f.x + dx, precision),
			y: num(baselineY + f.baselineShift, precision),
			...styleAttrs(f.style, options),
		}
		if (f.kind === 'marker') {
			// Browsers set tabular figures on ::marker and right-align the counter to the content
			// edge. Anchoring at the end lets the renderer's digit widths differ from the measured
			// ones (tabular figures aren't measurable through canvas) without moving that edge.
			attrs.x = num(line.x + f.x + f.width + dx, precision)
			attrs['text-anchor'] = 'end'
			attrs.style = 'font-variant-numeric: tabular-nums'
		}
		tspans.push({ tag: 'tspan', attrs, children: [f.text] })
	}
	if (tspans.length === 0) return nodes

	const textAttrs: Record<string, string | number> = {
		'xml:space': 'preserve',
		// Every tspan's x is its left edge and holds a single-direction run, so the document
		// direction stays ltr; plaintext keeps renderers from reordering runs a second time.
		'unicode-bidi': 'plaintext',
	}
	if (options.outline) {
		textAttrs['paint-order'] = 'stroke'
		textAttrs.stroke = options.outline.color
		textAttrs['stroke-width'] = num(options.outline.width, precision)
		textAttrs['stroke-linejoin'] = 'round'
	}
	nodes.push({ tag: 'text', attrs: textAttrs, children: tspans })
	return nodes
}

function symbolNode(
	symbol: MarkerSymbol,
	x: number,
	y: number,
	color: string,
	precision: number
): SvgNode {
	const { shape, size } = symbol
	if (shape === 'square') {
		return {
			tag: 'rect',
			attrs: {
				x: num(x + symbol.x, precision),
				y: num(y + symbol.y, precision),
				width: size,
				height: size,
				fill: color,
			},
			children: [],
		}
	}
	const attrs: Record<string, string | number> = {
		cx: num(x + symbol.x + size / 2, precision),
		cy: num(y + symbol.y + size / 2, precision),
		r: num(shape === 'circle' ? (size - 1) / 2 : size / 2, precision),
	}
	if (shape === 'circle') {
		attrs.fill = 'none'
		attrs.stroke = color
		attrs['stroke-width'] = 1
	} else {
		attrs.fill = color
	}
	return { tag: 'circle', attrs, children: [] }
}

/**
 * Render a layout to an SVG node tree rooted at a `<g>`. Baselines come from the layout's font
 * metrics, so the output needs no `dominant-baseline` or `alignment-baseline` support from the
 * renderer.
 *
 * @public
 */
export function renderSvgTree(layout: TextLayout, options: SvgRenderOptions = {}): SvgNode {
	const precision = options.precision ?? 2
	const children: SvgNode[] = []
	for (const line of layout.lines) children.push(...renderLine(line, options, precision))
	return { tag: 'g', attrs: { ...(options.attrs ?? {}) }, children }
}

const ESCAPE: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
}

function escape(text: string) {
	return text.replace(/[&<>"]/g, (ch) => ESCAPE[ch])
}

/**
 * Serialize an SVG node tree.
 *
 * @public
 */
export function svgNodeToString(node: SvgNode): string {
	const attrs = Object.entries(node.attrs)
		.map(([key, value]) => ` ${key}="${escape(String(value))}"`)
		.join('')
	if (node.children.length === 0) return `<${node.tag}${attrs}/>`
	const inner = node.children
		.map((child) => (typeof child === 'string' ? escape(child) : svgNodeToString(child)))
		.join('')
	return `<${node.tag}${attrs}>${inner}</${node.tag}>`
}

/**
 * Render a layout to an SVG fragment string (a `<g>` element). Wrap it in your own `<svg>`.
 *
 * @public
 */
export function renderSvg(layout: TextLayout, options: SvgRenderOptions = {}): string {
	return svgNodeToString(renderSvgTree(layout, options))
}
