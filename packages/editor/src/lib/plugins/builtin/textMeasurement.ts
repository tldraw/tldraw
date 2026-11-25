// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import type { BoxModel, TLDefaultHorizontalAlignStyle } from '@tldraw/tlschema'
import { defineCapability, definePlugin } from '../plugin'

/**
 * The whole-pixel line-height for a given font size and tldraw's unitless line-height
 * multiplier. tldraw's theme stores line-height as a multiplier (e.g. 1.35); resolving it
 * to a whole pixel keeps line spacing identical across rendering engines, which otherwise
 * disagree on fractional line boxes (WebKit snaps them to whole pixels, Blink keeps the
 * fraction) and let multi-line text drift apart. Apply it everywhere line-height is used —
 * measurement, on-canvas render, and export — so geometry and rendering agree.
 * See https://github.com/tldraw/tldraw/issues/8970.
 *
 * @public
 */
export function resolveLineHeightPx(fontSize: number, lineHeight: number): number {
	return Math.round(fontSize * lineHeight)
}

/** @public */
export interface BatchMeasurementRequest {
	html: string
	opts: TLMeasureTextOpts
}

/** @public */
export type TLMeasuredTextSize = BoxModel & {
	scrollWidth: number
}

/** @public */
export interface TLMeasureTextOpts {
	fontStyle: string
	fontWeight: string
	fontFamily: string
	fontSize: number
	/** This must be a number, e.g. 1.35, not a pixel value. */
	lineHeight: number
	/**
	 * When maxWidth is a number, the text will be wrapped to that maxWidth. When maxWidth
	 * is null, the text will be measured without wrapping, but explicit line breaks and
	 * space are preserved.
	 */
	maxWidth: null | number
	minWidth?: null | number
	// todo: make this a number so that it is consistent with other TLMeasureTextSpanOpts
	padding: string
	otherStyles?: Record<string, string>
	disableOverflowWrapBreaking?: boolean
	measureScrollWidth?: boolean
}

/** @public */
export interface TLMeasureTextSpanOpts {
	overflow: 'wrap' | 'truncate-ellipsis' | 'truncate-clip'
	width: number
	height: number
	padding: number
	fontSize: number
	fontWeight: string
	fontFamily: string
	fontStyle: string
	lineHeight: number
	textAlign: TLDefaultHorizontalAlignStyle
	otherStyles?: Record<string, string>
	measureScrollWidth?: boolean
}

/**
 * Measures text for shape geometry and SVG export. The DOM implementation is `domTextMeasurementPlugin`.
 *
 * @public
 */
export interface TLTextMeasurer {
	measureHtmlBatch(requests: BatchMeasurementRequest[]): TLMeasuredTextSize[]
	measureText(text: string, opts: TLMeasureTextOpts): TLMeasuredTextSize
	measureHtml(html: string, opts: TLMeasureTextOpts): TLMeasuredTextSize
	measureElementTextNodeSpans(
		element: HTMLElement,
		opts?: { shouldTruncateToFirstLine?: boolean }
	): { spans: { box: BoxModel; text: string }[]; didTruncate: boolean }
	measureTextSpans(text: string, opts: TLMeasureTextSpanOpts): { text: string; box: BoxModel }[]
}

/** @public */
export const textMeasurementCapability = defineCapability<TLTextMeasurer>('textMeasurement')

/**
 * A text measurer that needs no DOM. Each character is `charWidth` em wide and lines wrap at word
 * boundaries. Use it for headless editors (servers, tests, agents) where layout must be stable
 * but does not need to match a browser exactly.
 *
 * @public
 */
export function approximateTextMeasurementPlugin({ charWidth = 0.6 }: { charWidth?: number } = {}) {
	return definePlugin({
		id: 'approximateTextMeasurement',
		provides: [textMeasurementCapability],
		setup(ctx) {
			ctx.provide(textMeasurementCapability, new ApproximateTextMeasurer(charWidth))
		},
	})
}

class ApproximateTextMeasurer implements TLTextMeasurer {
	constructor(private readonly charWidth: number) {}

	measureHtmlBatch(requests: BatchMeasurementRequest[]) {
		return requests.map((r) => this.measureHtml(r.html, r.opts))
	}

	measureHtml(html: string, opts: TLMeasureTextOpts) {
		return this.measureText(htmlToText(html), opts)
	}

	measureText(text: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		const lines = this.layout(text, opts.fontSize, opts.maxWidth)
		const lineHeight = Math.round(opts.fontSize * opts.lineHeight)
		const padding = parseFloat(opts.padding) || 0
		const widest = Math.max(0, ...lines.map((l) => l.width))
		const w = Math.max(opts.minWidth ?? 0, widest + padding * 2)
		return { x: 0, y: 0, w, h: lines.length * lineHeight + padding * 2, scrollWidth: w }
	}

	measureTextSpans(text: string, opts: TLMeasureTextSpanOpts) {
		if (text === '') return []
		const lineHeight = Math.round(opts.fontSize * opts.lineHeight)
		const lines = this.layout(text, opts.fontSize, opts.width - opts.padding * 2)
		const shown = opts.overflow === 'wrap' ? lines : lines.slice(0, 1)
		return shown.map((line, i) => ({
			text: line.text,
			box: { x: opts.padding, y: opts.padding + i * lineHeight, w: line.width, h: lineHeight },
		}))
	}

	measureElementTextNodeSpans(): never {
		throw Error('measureElementTextNodeSpans needs a DOM. Use the DOM text measurement plugin.')
	}

	private layout(text: string, fontSize: number, maxWidth: number | null) {
		const em = fontSize * this.charWidth
		const lines: { text: string; width: number }[] = []
		for (const paragraph of text.split(/\r?\n|\r/)) {
			let line = ''
			for (const word of paragraph.split(/(?<=\s)/)) {
				const next = line + word
				if (maxWidth !== null && line && next.trimEnd().length * em > maxWidth) {
					lines.push({ text: line, width: line.trimEnd().length * em })
					line = word
				} else {
					line = next
				}
			}
			lines.push({ text: line, width: line.trimEnd().length * em })
		}
		return lines
	}
}

function htmlToText(html: string) {
	return html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>\s*<p[^>]*>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
}
