import { BoxModel, TLDefaultHorizontalAlignStyle, TLRichText } from '@tldraw/tlschema'
import type { Editor } from '../../Editor'

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
	/**
	 * The rich text document the measured HTML was rendered from, when there is one. The DOM
	 * measurer ignores it; a headless {@link TLTextMeasurer} lays the document out directly rather
	 * than parsing HTML.
	 */
	richText?: TLRichText
}

/**
 * A replacement for the DOM-backed text measurement in {@link TextManager}, injected through
 * {@link TLEditorOptions.textMeasurer}. Implementations must return the same box model the DOM
 * measurer does: `w`/`h` include padding and `scrollWidth` is only needed when
 * `measureScrollWidth` is set.
 *
 * @public
 */
export interface TLTextMeasurer {
	/** Preserve request order; the manager adapts this to older HTML backends when omitted. */
	measureRichTextBatch?(requests: TLBatchRichTextMeasurementRequest[]): TLMeasuredTextSize[]
	/** Measure a source document without eager HTML serialization; omission uses the HTML adapter. */
	measureRichText?(request: TLMeasureRichTextRequest, opts: TLMeasureTextOpts): TLMeasuredTextSize
	/** Measure plain text; newlines are line breaks and empty lines still take a line. */
	measureText(text: string, opts: TLMeasureTextOpts): TLMeasuredTextSize
	/** Measure rendered rich text. `opts.richText` carries the source document when available. */
	measureHtml(html: string, opts: TLMeasureTextOpts): TLMeasuredTextSize
	/** Measure several rich text documents at once; results are in request order. */
	measureHtmlBatch(requests: BatchMeasurementRequest[]): TLMeasuredTextSize[]
	/** Break text into positioned word/whitespace spans, the way frame headings are exported. */
	measureTextSpans(text: string, opts: TLMeasureTextSpanOpts): { text: string; box: BoxModel }[]
	/** Called when an editor this measurer was given to is disposed; share one across editors with that in mind. */
	dispose?(): void
}

/**
 * Creates a measurer owned by one editor. The factory runs during construction; defer access
 * to other editor managers until a measurement is requested.
 *
 * @public
 */
export type TLTextMeasurerFactory = (editor: Editor) => TLTextMeasurer

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

/** @public */
export interface TLBatchRichTextMeasurementRequest {
	request: TLMeasureRichTextRequest
	opts: TLMeasureTextOpts
}

/** @public */
export interface TLMeasureRichTextRequest {
	richText: TLRichText
	/** Browser representation, evaluated only when a backend needs HTML. */
	html: string | (() => string)
}
