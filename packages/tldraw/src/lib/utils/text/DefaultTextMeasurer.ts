import { JSONContent } from '@tiptap/core'
import {
	BatchMeasurementRequest,
	TLBatchRichTextMeasurementRequest,
	DomTextMeasurer,
	Editor,
	EditorManager,
	TLMeasureRichTextRequest,
	TLMeasuredTextSize,
	TLMeasureTextOpts,
	TLMeasureTextSpanOpts,
	TLTextMeasurer,
} from '@tldraw/editor'
import { TldrawTextMeasurer } from './createTldrawTextMeasurer'
import { PretextTextMeasurer } from './PretextTextMeasurer'
// These scripts and emoji need browser shaping/fallback behavior beyond the Latin golden corpus.
const needsDomShaping =
	/[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]|\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|[\u200d\u202a-\u202e\u2066-\u2069]|\ufe0f|\u20e3/u
const supportedNodes = new Set([
	'doc',
	'paragraph',
	'heading',
	'blockquote',
	'codeBlock',
	'bulletList',
	'orderedList',
	'listItem',
	'hardBreak',
	'text',
])
const supportedMarks = new Set([
	'bold',
	'italic',
	'strike',
	'underline',
	'code',
	'link',
	'highlight',
	'subscript',
	'superscript',
])

function supportsRichText(node: JSONContent): boolean {
	if (!supportedNodes.has(node.type ?? '') || (node.text && needsDomShaping.test(node.text)))
		return false
	if (node.attrs?.dir === 'rtl') return false
	if (node.marks?.some((mark) => !supportedMarks.has(mark.type))) return false
	return !node.content || node.content.every(supportsRichText)
}

/** @internal */
export function createDefaultTextMeasurer(editor: Editor): TLTextMeasurer {
	return new DefaultTextMeasurer(editor)
}

class DefaultTextMeasurer extends EditorManager implements TLTextMeasurer {
	private readonly pretext: PretextTextMeasurer
	private dom: DomTextMeasurer | undefined
	constructor(editor: Editor) {
		super(editor)
		this.pretext = new PretextTextMeasurer(editor)
		this.register(() => {
			this.pretext.dispose()
			this.dom?.dispose()
		})
	}
	private getDom() {
		return (this.dom ??= new DomTextMeasurer(this.editor))
	}

	private tryNative<T>(
		opts: TLMeasureTextOpts | TLMeasureTextSpanOpts,
		measure: (native: TldrawTextMeasurer) => T
	): T | undefined {
		try {
			const native = this.pretext.getMeasurer(opts)
			if (native) return measure(native)
		} catch {
			// Unsupported inputs must still get browser geometry; keep failures local to a request.
		}
		return undefined
	}

	measureText(text: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		const result = !needsDomShaping.test(text)
			? this.tryNative(opts, (native) => native.measureText(text, opts))
			: undefined
		return result ?? this.getDom().measureText(text, opts)
	}

	measureRichText(request: TLMeasureRichTextRequest, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		return this.measureRequest(request.html, { ...opts, richText: request.richText })
	}
	measureHtml(html: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		return this.measureRequest(html, opts)
	}
	private measureRequest(
		html: TLMeasureRichTextRequest['html'],
		opts: TLMeasureTextOpts
	): TLMeasuredTextSize {
		const result =
			opts.richText && supportsRichText(opts.richText as JSONContent)
				? this.tryNative(opts, (native) =>
						native.measureRichText({ richText: opts.richText!, html }, opts)
					)
				: undefined
		return result ?? this.getDom().measureHtml(typeof html === 'function' ? html() : html, opts)
	}
	measureRichTextBatch(requests: TLBatchRichTextMeasurementRequest[]): TLMeasuredTextSize[] {
		return this.measureBatch(
			requests.map(({ request, opts }) => ({
				html: request.html,
				opts: { ...opts, richText: request.richText },
			}))
		)
	}
	measureHtmlBatch(requests: BatchMeasurementRequest[]): TLMeasuredTextSize[] {
		return this.measureBatch(requests)
	}
	private measureBatch(
		requests: { html: TLMeasureRichTextRequest['html']; opts: TLMeasureTextOpts }[]
	): TLMeasuredTextSize[] {
		const results: TLMeasuredTextSize[] = new Array(requests.length)
		const fallback: BatchMeasurementRequest[] = []
		const indices: number[] = []
		for (const [i, { html, opts }] of requests.entries()) {
			const result =
				opts.richText && supportsRichText(opts.richText as JSONContent)
					? this.tryNative(opts, (native) =>
							native.measureRichText({ richText: opts.richText!, html }, opts)
						)
					: undefined
			if (result) results[i] = result
			else {
				indices.push(i)
				fallback.push({ html: typeof html === 'function' ? html() : html, opts })
			}
		}
		if (fallback.length) {
			for (const [i, result] of this.getDom().measureHtmlBatch(fallback).entries())
				results[indices[i]] = result
		}
		return results
	}

	measureTextSpans(text: string, opts: TLMeasureTextSpanOpts) {
		const result = !needsDomShaping.test(text)
			? this.tryNative(opts, (native) => native.measureTextSpans(text, opts))
			: undefined
		return result ?? this.getDom().measureTextSpans(text, opts)
	}
}
