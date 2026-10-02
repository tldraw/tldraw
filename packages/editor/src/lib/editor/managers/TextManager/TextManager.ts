import { BoxModel } from '@tldraw/tlschema'
import type { Editor } from '../../Editor'
import { EditorManager } from '../EditorManager'
import { DomTextMeasurer } from './DomTextMeasurer'
import {
	BatchMeasurementRequest,
	TLBatchRichTextMeasurementRequest,
	TLMeasuredTextSize,
	TLMeasureRichTextRequest,
	TLMeasureTextOpts,
	TLMeasureTextSpanOpts,
	TLTextMeasurer,
} from './TextMeasurer'
export {
	resolveLineHeightPx,
	type BatchMeasurementRequest,
	type TLBatchRichTextMeasurementRequest,
	type TLMeasuredTextSize,
	type TLMeasureRichTextRequest,
	type TLMeasureTextOpts,
	type TLMeasureTextSpanOpts,
	type TLTextMeasurer,
	type TLTextMeasurerFactory,
} from './TextMeasurer'

/** @public */
export class TextManager extends EditorManager {
	/** The supplied measurer, or null for the default DOM backend. */
	readonly injected: TLTextMeasurer | null
	private readonly measurer: TLTextMeasurer
	private dom: DomTextMeasurer | undefined

	constructor(editor: Editor, injected: TLTextMeasurer | null = null) {
		super(editor)
		this.injected = injected
		this.measurer = injected ?? (this.dom = new DomTextMeasurer(editor))
		this.register(() => {
			this.measurer.dispose?.()
			if (this.dom !== this.measurer) this.dom?.dispose()
		})
	}

	measureRichText(request: TLMeasureRichTextRequest, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		if (this.measurer.measureRichText) return this.measurer.measureRichText(request, opts)
		return this.measurer.measureHtml(
			typeof request.html === 'function' ? request.html() : request.html,
			{ ...opts, richText: request.richText }
		)
	}

	measureRichTextBatch(requests: TLBatchRichTextMeasurementRequest[]): TLMeasuredTextSize[] {
		if (this.measurer.measureRichTextBatch) return this.measurer.measureRichTextBatch(requests)
		if (this.measurer.measureRichText)
			return requests.map(({ request, opts }) => this.measureRichText(request, opts))
		return this.measurer.measureHtmlBatch(
			requests.map(({ request, opts }) => ({
				html: typeof request.html === 'function' ? request.html() : request.html,
				opts: { ...opts, richText: request.richText },
			}))
		)
	}

	measureText(text: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		return this.measurer.measureText(text, opts)
	}

	measureHtml(html: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		return this.measurer.measureHtml(html, opts)
	}

	measureHtmlBatch(requests: BatchMeasurementRequest[]): TLMeasuredTextSize[] {
		return this.measurer.measureHtmlBatch(requests)
	}

	measureTextSpans(text: string, opts: TLMeasureTextSpanOpts): { text: string; box: BoxModel }[] {
		return this.measurer.measureTextSpans(text, opts)
	}

	/** Measure existing DOM content independently of the selected text backend. */

	measureElementTextNodeSpans(
		element: HTMLElement,
		opts: { shouldTruncateToFirstLine?: boolean } = {}
	) {
		return (this.dom ??= new DomTextMeasurer(this.editor)).measureElementTextNodeSpans(
			element,
			opts
		)
	}
}
