import type { Extensions } from '@tiptap/core'
import {
	BatchMeasurementRequest,
	BoxModel,
	DefaultFontFamilies,
	TLMeasuredTextSize,
	TLMeasureTextOpts,
	TLMeasureTextSpanOpts,
	TLRichText,
	TLTextMeasurer,
	resolveLineHeightPx,
} from '@tldraw/editor'
import {
	MeasureContext,
	NodeRegistry,
	StyleDeclaration,
	StyleSheet,
	TextLayout,
	defaultNodeRegistry,
	layoutDocument,
	layoutPlainText,
	markRule,
	nodeRule,
} from '@tldraw/rich-text-layout'

/**
 * Colours the tldraw stylesheet gives links and highlights. They only matter when a layout is
 * rendered; measurement is the same regardless.
 *
 * @public
 */
export interface TldrawRichTextColors {
	/** Link text colour; `--tl-color-primary`. */
	link?: string
	/** Highlight mark background; `#fddd00` in light mode, `--tl-color-text-highlight` in dark. */
	highlight?: string
}

/**
 * Options for {@link createTldrawTextMeasurer}.
 *
 * @public
 */
export interface TldrawTextMeasurerOptions {
	/** Measurement backend with tldraw's fonts registered (see `@tldraw/rich-text-layout`). */
	measureContext: MeasureContext
	/**
	 * The editor's TipTap extensions, used to classify nodes outside the default set. Defaults to
	 * the StarterKit node set tldraw ships.
	 */
	extensions?: Extensions
	/** Colours used when the layout is rendered; measurement doesn't depend on them. */
	colors?: TldrawRichTextColors
}

/**
 * Measurement options plus the horizontal alignment used when positioning lines.
 *
 * @public
 */
export interface TldrawRichTextLayoutOptions extends TLMeasureTextOpts {
	textAlign?: 'start' | 'center' | 'end' | 'left' | 'right'
	/** Overrides the measurer's colours for this layout, e.g. for a dark-mode export. */
	colors?: TldrawRichTextColors
	/** Text colour written to the layout's fragments; measurement doesn't depend on it. */
	color?: string
}

/**
 * A {@link @tldraw/editor#TLTextMeasurer} built on `@tldraw/rich-text-layout`, plus the layout
 * itself for renderers.
 *
 * @public
 */
export interface TldrawTextMeasurer extends TLTextMeasurer {
	readonly measureContext: MeasureContext
	layoutRichText(richText: TLRichText, opts: TldrawRichTextLayoutOptions): TextLayout
	layoutText(text: string, opts: TldrawRichTextLayoutOptions): TextLayout
}

const fixNewLines = /\r?\n|\r/g

const SPAN_TEXT_ALIGN: Record<TLMeasureTextSpanOpts['textAlign'], 'left' | 'center' | 'right'> = {
	start: 'left',
	'start-legacy': 'left',
	middle: 'center',
	'middle-legacy': 'center',
	end: 'right',
	'end-legacy': 'right',
}

/** What `TextManager.measureText` does to plain text before handing it to the DOM. */
function normalizeTextForDom(text: string) {
	return text
		.replace(fixNewLines, '\n')
		.split('\n')
		.map((x) => x || ' ')
		.join('\n')
}

const FONT_VAR = /^var\(--tl-font-(draw|sans|serif|mono)\)$/

function resolveFontFamily(fontFamily: string) {
	const match = FONT_VAR.exec(fontFamily.trim())
	if (match) return DefaultFontFamilies[match[1] as keyof typeof DefaultFontFamilies]
	return fontFamily
}

function parsePx(value: string | number | undefined): number {
	if (value === undefined) return 0
	if (typeof value === 'number') return value
	const n = parseFloat(value)
	return Number.isFinite(n) ? n : 0
}

/**
 * tldraw's rich text rules, transcribed from the `.tl-rich-text` block of `editor.css`. Anything
 * not listed here falls through to the user agent sheet, which is what `list-style: revert` and
 * the default heading sizes rely on.
 *
 * @public
 */
export function createTldrawRichTextStyles(opts: {
	/** tldraw's unitless line height multiplier, applied to headings' own font size. */
	lineHeight: number
	colors?: TldrawRichTextColors
}): StyleSheet {
	const link = opts.colors?.link ?? '#2f80ed'
	const highlight = opts.colors?.highlight ?? '#fddd00'
	return [
		// The TextDirection extension writes a `dir` attribute on every block.
		{
			match: (ctx) => {
				const dir = ctx.node.attrs?.dir
				return dir === 'ltr' || dir === 'rtl' || dir === 'auto'
			},
			style: (ctx) => ({ direction: ctx.node.attrs!.dir as 'ltr' | 'rtl' | 'auto' }),
		},
		nodeRule('paragraph', { marginTop: 0, marginBottom: 0, minHeight: '1lh' }),
		nodeRule(['bulletList', 'orderedList'], (ctx) => {
			const items = ctx.node.content?.length ?? 0
			return {
				textAlign: 'left',
				marginTop: 0,
				marginBottom: 0,
				// ol:has(> li:nth-child(10)) and :nth-child(100) widen the gutter for the counter.
				paddingLeft:
					ctx.type === 'orderedList' && items >= 100
						? '3.625ch'
						: ctx.type === 'orderedList' && items >= 10
							? '2.625ch'
							: '1.625ch',
			}
		}),
		nodeRule('heading', {
			marginTop: '5px',
			marginBottom: '10px',
			lineHeight: opts.lineHeight,
		}),
		markRule('link', { color: link, textDecoration: 'underline' }),
		// `code` keeps the body size: the monospace shrink in the UA sheet only applies when the
		// family is the bare `monospace` keyword, and tldraw names its own family.
		markRule('code', { fontFamily: DefaultFontFamilies.mono, fontSize: '1em' }),
		markRule('highlight', { background: highlight }),
	]
}

function registryFromExtensions(extensions: Extensions | undefined): NodeRegistry {
	if (!extensions) return defaultNodeRegistry
	const out: Record<string, NodeRegistry[string]> = { ...defaultNodeRegistry }
	for (const ext of extensions) {
		if (ext.type !== 'node' || out[ext.name]) continue
		// Extensions bundled inside StarterKit never appear here; they are covered by the
		// default registry. Custom nodes are classified by their ProseMirror group.
		const group = (ext as { config?: { group?: unknown } }).config?.group
		const isBlock = typeof group === 'string' && /\bblock\b/.test(group)
		out[ext.name] = { kind: isBlock ? 'block' : 'inline' }
	}
	return out
}

/**
 * Create a headless replacement for the editor's DOM text measurement. Pass the result as
 * `textMeasurer` in the editor options; shape geometry (text, geo, note and arrow labels, frame
 * headings) is then measured with `@tldraw/rich-text-layout` instead of a hidden element.
 *
 * The measure context must have tldraw's four font families registered under their CSS names
 * (`tldraw_draw`, `tldraw_sans`, `tldraw_serif`, `tldraw_mono`), and `installMeasureContext`
 * must have resolved before the editor measures anything.
 *
 * @public
 */
export function createTldrawTextMeasurer(options: TldrawTextMeasurerOptions): TldrawTextMeasurer {
	const { measureContext } = options
	const registry = registryFromExtensions(options.extensions)
	const sheets = new Map<string, StyleSheet>()
	const sheetFor = (lineHeight: number, colors: TldrawRichTextColors | undefined) => {
		const key = `${lineHeight} ${colors?.link ?? ''} ${colors?.highlight ?? ''}`
		let sheet = sheets.get(key)
		if (!sheet) {
			sheet = createTldrawRichTextStyles({ lineHeight, colors: { ...options.colors, ...colors } })
			sheets.set(key, sheet)
		}
		return sheet
	}

	function rootStyle(opts: TldrawRichTextLayoutOptions, tabSize: number): StyleDeclaration {
		const other = opts.otherStyles ?? {}
		return {
			fontFamily: resolveFontFamily(opts.fontFamily),
			fontSize: opts.fontSize,
			fontWeight: opts.fontWeight as StyleDeclaration['fontWeight'],
			fontStyle: opts.fontStyle as StyleDeclaration['fontStyle'],
			color: opts.color,
			lineHeight: `${resolveLineHeightPx(opts.fontSize, opts.lineHeight)}px`,
			whiteSpace: (other['white-space'] as StyleDeclaration['whiteSpace']) ?? 'pre-wrap',
			overflowWrap:
				(other['overflow-wrap'] as StyleDeclaration['overflowWrap']) ??
				(opts.disableOverflowWrapBreaking ? 'normal' : 'break-word'),
			wordBreak: (other['word-break'] as StyleDeclaration['wordBreak']) ?? 'normal',
			tabSize: other['tab-size'] ? parsePx(other['tab-size']) : tabSize,
			direction: 'auto',
			textAlign:
				opts.textAlign ?? (other['text-align'] as StyleDeclaration['textAlign']) ?? 'start',
			letterSpacing: other['letter-spacing'] ? parsePx(other['letter-spacing']) : 0,
		}
	}

	function sizing(opts: TldrawRichTextLayoutOptions) {
		// The DOM measurer leaves max/min-width unset for falsy values, including 0.
		const other = opts.otherStyles ?? {}
		const maxWidth = other['max-width'] ? parsePx(other['max-width']) : opts.maxWidth || null
		const minWidth = other['min-width'] ? parsePx(other['min-width']) : opts.minWidth || 0
		const fixed = other['width'] ? parsePx(other['width']) : null
		return {
			maxWidth: fixed ?? maxWidth,
			minWidth: fixed ?? minWidth,
			padding: parsePx(opts.padding),
		}
	}

	function toSize(layout: TextLayout, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		let scrollWidth = 0
		if (opts.measureScrollWidth) {
			let right = layout.width
			for (const line of layout.lines) {
				for (const f of line.fragments) right = Math.max(right, line.x + f.x + f.width)
			}
			scrollWidth = Math.round(right)
		}
		return { x: 0, y: 0, w: layout.width, h: layout.height, scrollWidth }
	}

	function layoutRichText(richText: TLRichText, opts: TldrawRichTextLayoutOptions): TextLayout {
		return layoutDocument(richText as never, {
			...sizing(opts),
			registry,
			styles: sheetFor(opts.lineHeight, opts.colors),
			rootStyle: rootStyle(opts, 2),
			measureContext,
		})
	}

	function layoutText(text: string, opts: TldrawRichTextLayoutOptions): TextLayout {
		// Plain text is measured outside `.tl-rich-text`, so it gets the UA tab size.
		return layoutPlainText(normalizeTextForDom(text), {
			...sizing(opts),
			style: rootStyle(opts, 8),
			measureContext,
		})
	}

	function measureHtml(html: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		if (opts.richText) return toSize(layoutRichText(opts.richText, opts), opts)
		// Without the source document all we can do is approximate the HTML as paragraphs of
		// plain text. Every call site in tldraw passes `richText`.
		const text = html
			.replace(/<br\s*\/?>/g, '\n')
			.replace(/<\/p>\s*<p[^>]*>/g, '\n')
			.replace(/<[^>]+>/g, '')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&')
			.replace(/&nbsp;/g, ' ')
		return toSize(layoutText(text, opts), opts)
	}

	return {
		measureContext,
		layoutRichText,
		layoutText,
		measureText(text, opts) {
			return toSize(layoutText(text, opts), opts)
		},
		measureHtml,
		measureHtmlBatch(requests: BatchMeasurementRequest[]) {
			return requests.map(({ html, opts }) => measureHtml(html, opts))
		},
		measureTextSpans(text: string, opts: TLMeasureTextSpanOpts) {
			return measureSpans(text, opts)
		},
	}

	function measureSpans(
		text: string,
		opts: TLMeasureTextSpanOpts
	): { text: string; box: BoxModel }[] {
		if (text === '') return []
		const truncate = opts.overflow === 'truncate-ellipsis' || opts.overflow === 'truncate-clip'
		const elementWidth = Math.ceil(opts.width - opts.padding * 2)
		const layoutOpts = (width: number): TldrawRichTextLayoutOptions => ({
			fontFamily: opts.fontFamily,
			fontStyle: opts.fontStyle,
			fontWeight: opts.fontWeight,
			fontSize: opts.fontSize,
			lineHeight: opts.lineHeight,
			padding: '0px',
			maxWidth: null,
			textAlign: SPAN_TEXT_ALIGN[opts.textAlign],
			otherStyles: {
				width: `${width}px`,
				'overflow-wrap': truncate ? 'anywhere' : 'break-word',
				'word-break': truncate ? 'break-all' : 'normal',
				...opts.otherStyles,
			},
		})

		const toSpans = (layout: TextLayout, firstLineOnly: boolean) => {
			const spans: { text: string; box: BoxModel }[] = []
			const lines = firstLineOnly ? layout.lines.slice(0, 1) : layout.lines
			for (const line of lines) {
				for (const f of line.fragments) {
					if (f.kind === 'marker') continue
					const m = measureContext.metrics(f.style.font)
					spans.push({
						text: f.text,
						box: {
							x: line.x + f.x,
							y: line.y + line.baseline + f.baselineShift - m.ascent,
							w: f.width,
							h: m.ascent + m.descent,
						},
					})
				}
			}
			return spans
		}

		const layout = layoutText(text, layoutOpts(elementWidth))
		if (!truncate || layout.lines.length <= 1) return toSpans(layout, false)

		if (opts.overflow === 'truncate-clip') return toSpans(layout, true)

		const ellipsisWidth = Math.ceil(
			measureContext.measure(
				'…',
				layout.lines[0].fragments[0]?.style.font ?? layout.blocks[0].style.font
			).width
		)
		const truncated = toSpans(layoutText(text, layoutOpts(elementWidth - ellipsisWidth)), true)
		const last = truncated[truncated.length - 1]
		if (!last) return truncated
		truncated.push({
			text: '…',
			box: {
				x: Math.min(last.box.x + last.box.w, opts.width - opts.padding - ellipsisWidth),
				y: last.box.y,
				w: ellipsisWidth,
				h: last.box.h,
			},
		})
		return truncated
	}
}
