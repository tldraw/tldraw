import { layoutText, MONOSPACE_ADVANCE, htmlToText, type TextMetrics } from '../editor/textMeasure'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Rasterizers resolve this with fontconfig; DejaVu on Linux, Menlo on macOS, Consolas on Windows. */
export const CAPTURE_FONT_FAMILY = 'DejaVu Sans Mono, Menlo, Consolas, Liberation Mono, monospace'

export interface FlattenSvgTextOptions {
	/** The metrics the editor measured labels with, so lines wrap where the shapes expect. */
	metrics: TextMetrics
	/** Canvas colour drawn behind glyphs, like tldraw's text outline. Null for no outline. */
	outline: string | null
	/** Colour painted behind the whole image (SVG rasterizers ignore the root's CSS background). */
	background: string | null
}

function px(value: string | null | undefined, fallback: number): number {
	const n = value ? parseFloat(value) : NaN
	return Number.isFinite(n) ? n : fallback
}

function anchorFor(textAlign: string): 'start' | 'middle' | 'end' {
	if (textAlign === 'center' || textAlign === 'middle') return 'middle'
	if (textAlign === 'end' || textAlign === 'right') return 'end'
	return 'start'
}

/**
 * tldraw exports labels as HTML inside `<foreignObject>` (RichTextLabel.tsx RichTextSVG), which
 * librsvg and most image pipelines cannot draw: the text silently disappears. This rewrites each
 * one as plain SVG `<text>`, laid out with the same wrapping the editor measured with, in a
 * monospace font sized so its advance matches those metrics.
 */
export function flattenSvgText(svg: string, opts: FlattenSvgTextOptions): string {
	const parser = new window.DOMParser()
	const doc = parser.parseFromString(svg, 'image/svg+xml')
	const root = doc.documentElement
	if (root.nodeName !== 'svg') return svg

	for (const fo of Array.from(root.getElementsByTagName('foreignObject'))) {
		const group = doc.createElementNS(SVG_NS, 'g')
		const outer = fo.getElementsByTagName('div')[0] as HTMLElement | undefined
		const inner = outer?.getElementsByTagName('div')[0] as HTMLElement | undefined
		if (outer && inner) appendLabel(doc, group, fo, outer, inner, opts)
		fo.parentNode?.replaceChild(group, fo)
	}

	if (opts.background) {
		const vb = (root.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number)
		if (vb.length === 4 && vb.every(Number.isFinite)) {
			const rect = doc.createElementNS(SVG_NS, 'rect')
			rect.setAttribute('x', String(vb[0]))
			rect.setAttribute('y', String(vb[1]))
			rect.setAttribute('width', String(vb[2]))
			rect.setAttribute('height', String(vb[3]))
			rect.setAttribute('fill', opts.background)
			root.insertBefore(rect, root.firstChild)
		}
	}

	return new window.XMLSerializer().serializeToString(root)
}

function appendLabel(
	doc: Document,
	group: Element,
	fo: Element,
	outer: HTMLElement,
	inner: HTMLElement,
	opts: FlattenSvgTextOptions
) {
	const text = htmlToText(inner.innerHTML)
	if (text.trim() === '') return

	const x = px(fo.getAttribute('x'), 0)
	const y = px(fo.getAttribute('y'), 0)
	const w = px(fo.getAttribute('width'), 0)
	const h = px(fo.getAttribute('height'), 0)
	const pad = px(outer.style.padding, 0)
	const fontSize = px(inner.style.fontSize, 16)
	const lineHeightPx = px(inner.style.lineHeight, fontSize * 1.35)
	const charW = opts.metrics.charWidth(fontSize)
	const lineH = opts.metrics.lineHeight(fontSize, lineHeightPx / fontSize)
	const renderSize = charW / MONOSPACE_ADVANCE

	const innerW = Math.max(0, w - pad * 2)
	const innerH = Math.max(0, h - pad * 2)
	// The +0.5 absorbs the 1 px tldraw adds to autosized text widths (TextShapeUtil.getTextSize).
	const maxWidthCells = Math.max(1, Math.floor((innerW + 0.5) / charW))
	const { lines } = layoutText(text, { maxWidthCells })

	const blockH = lines.length * lineH
	const align = outer.style.alignItems
	const top =
		y +
		pad +
		(align === 'center'
			? (innerH - blockH) / 2
			: align === 'flex-end' || align === 'end'
				? innerH - blockH
				: 0)
	const anchor = anchorFor(inner.style.textAlign)
	const ax =
		anchor === 'middle' ? x + pad + innerW / 2 : anchor === 'end' ? x + pad + innerW : x + pad

	for (let i = 0; i < lines.length; i++) {
		if (lines[i] === '') continue
		const t = doc.createElementNS(SVG_NS, 'text')
		t.setAttribute('x', fmt(ax))
		// Centre the glyphs on the line box: cap height sits about 0.35 em above the middle.
		t.setAttribute('y', fmt(top + i * lineH + lineH / 2 + renderSize * 0.35))
		t.setAttribute('font-family', CAPTURE_FONT_FAMILY)
		t.setAttribute('font-size', fmt(renderSize))
		t.setAttribute('fill', inner.style.color || 'currentColor')
		t.setAttribute('text-anchor', anchor)
		t.setAttribute('xml:space', 'preserve')
		// RichTextSVG marks which labels tldraw outlines (`tl-text__outline`); notes and filled
		// labels opt out, and an outline there draws a halo over the fill.
		if (opts.outline && (fo.getAttribute('class') ?? '').includes('tl-text__outline')) {
			t.setAttribute('stroke', opts.outline)
			t.setAttribute('stroke-width', fmt(renderSize * 0.15))
			t.setAttribute('stroke-linejoin', 'round')
			t.setAttribute('paint-order', 'stroke')
		}
		t.textContent = lines[i]
		group.appendChild(t)
	}
}

function fmt(n: number): string {
	return String(Math.round(n * 100) / 100)
}
