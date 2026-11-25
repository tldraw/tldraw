// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import type { BoxModel } from '@tldraw/tlschema'
import type {
	BatchMeasurementRequest,
	TLMeasuredTextSize,
	TLMeasureTextOpts,
	TLMeasureTextSpanOpts,
} from '../../editor/managers/TextManager/TextManager'
import { defineCapability, definePlugin } from '../plugin'

/**
 * Measures text for shape geometry and SVG export. The DOM implementation is `TextManager`.
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
