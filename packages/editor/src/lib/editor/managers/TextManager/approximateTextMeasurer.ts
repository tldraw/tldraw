import {
	BatchMeasurementRequest,
	TLMeasuredTextSize,
	TLMeasureTextOpts,
	TLMeasureTextSpanOpts,
	TLTextMeasurer,
} from './TextManager'

/**
 * A dependency-free {@link TLTextMeasurer} that estimates text size from character counts
 * instead of laying text out. It is the default measurer for headless editors and tests. It is
 * deterministic but not pixel-accurate, and measured bounds are written into the document, so
 * inject an accurate measurer when browser clients will see the shapes.
 *
 * Note: the shared instance is frozen, since patching it would affect every editor in the
 * process. To customize it, spread it into a new object.
 *
 * @public
 */
export const approximateTextMeasurer: TLTextMeasurer = Object.freeze({
	measureText(textToMeasure: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		// Falsy maxWidth means no wrapping, matching the DOM path — and guards ceil(w / 0) below
		const maxWidth = opts.maxWidth || null
		const breaks = textToMeasure.split('\n')
		const longest = breaks.reduce((acc, curr) => {
			return curr.length > acc.length ? curr : acc
		}, '')

		const w = longest.length * (opts.fontSize / 2)

		return {
			x: 0,
			y: 0,
			w: maxWidth === null ? w : Math.max(w, maxWidth),
			h:
				(maxWidth === null ? breaks.length : Math.ceil(w / maxWidth) + breaks.length) *
				opts.fontSize,
			scrollWidth: opts.measureScrollWidth ? (maxWidth === null ? w : Math.max(w, maxWidth)) : 0,
		}
	},

	measureHtml(html: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		const textToMeasure = html
			// Newline-bearing whitespace between tags is pretty-printing; left in place it
			// becomes phantom blank lines. Single inline spaces carry no newline and survive.
			.replace(/>\s*\n\s*</g, '><')
			// A break right before a block close is the serializer's empty-paragraph filler;
			// the closing tag below supplies the newline, so drop it or the line counts twice.
			.replace(/<br\b[^>]*>\s*<\/(p|h[1-6])>/g, '</$1>')
			// Remaining hard breaks are real line breaks; the serializer emits them with
			// attributes (<br dir="auto">), so tolerate any.
			.replace(/<br\b[^>]*>/g, '\n')
			// Closing paragraph/heading tags end a line whatever their attributes — pasted
			// content renders with dir="rtl"/"ltr", not dir="auto".
			.replace(/<\/(?:p|h[1-6])>/g, '\n')
			.replace(/<[^>]+>/g, '')
			.replace(/\n$/, '')
			// Decode the entities the serializer escapes; &amp; last or "&amp;lt;" double-decodes
			.replaceAll('&nbsp;', ' ')
			.replaceAll('&lt;', '<')
			.replaceAll('&gt;', '>')
			.replaceAll('&amp;', '&')
		return approximateTextMeasurer.measureText(textToMeasure, opts)
	},

	measureHtmlBatch(requests: BatchMeasurementRequest[]): TLMeasuredTextSize[] {
		return requests.map((r) => approximateTextMeasurer.measureHtml(r.html, r.opts))
	},

	measureTextSpans(textToMeasure: string, opts: TLMeasureTextSpanOpts) {
		const box = approximateTextMeasurer.measureText(textToMeasure, {
			...opts,
			maxWidth: opts.width,
			padding: `${opts.padding}px`,
		})
		return [{ box, text: textToMeasure }]
	},

	// Deliberately no dispose: TextManager disposes an injected measurer with its first
	// owning editor, and this shared singleton must survive that for every other live editor.
})
