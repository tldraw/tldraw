import { JSONContent } from '@tiptap/core'
import {
	atom,
	BatchMeasurementRequest,
	DefaultFontFamilies,
	Editor,
	EditorManager,
	TextManager,
	TLMeasuredTextSize,
	TLMeasureTextOpts,
	TLMeasureTextSpanOpts,
	TLTextMeasurer,
} from '@tldraw/editor'
import { createCanvasMeasureContext, installMeasureContext } from '@tldraw/rich-text-layout'
import { allDefaultFontFaces } from '../../shapes/shared/defaultFonts'
import { createTldrawTextMeasurer, TldrawTextMeasurer } from './createTldrawTextMeasurer'
import { tipTapDefaultExtensions } from './richText'

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
	private readonly ready = atom('native text measurement ready', false)
	private readonly fontEpoch = atom('native text measurement fonts', 0)
	private native: TldrawTextMeasurer | undefined
	private dom: TextManager | undefined
	private context: CanvasRenderingContext2D | undefined
	private disposed = false
	private defaultFontsLoaded = false

	constructor(editor: Editor) {
		super(editor)
		const fonts = editor.getContainerDocument().fonts
		const invalidateFonts = () => {
			// Both canvas and pretext cache font widths. A new context isolates the old caches.
			this.native = undefined
			this.defaultFontsLoaded = false
			this.fontEpoch.update((epoch) => epoch + 1)
		}
		fonts?.addEventListener?.('loading', invalidateFonts)
		fonts?.addEventListener?.('loadingdone', invalidateFonts)
		fonts?.addEventListener?.('loadingerror', invalidateFonts)
		this.register(() => {
			this.disposed = true
			fonts?.removeEventListener?.('loading', invalidateFonts)
			fonts?.removeEventListener?.('loadingdone', invalidateFonts)
			fonts?.removeEventListener?.('loadingerror', invalidateFonts)
			this.dom?.dispose()
		})
		void this.initialize()
	}

	private async initialize() {
		try {
			// The factory runs before FontManager exists. Startup measurements use the DOM.
			await Promise.resolve()
			if (this.disposed) return
			const doc = this.editor.getContainerDocument()
			if (!doc.fonts?.check || !doc.fonts.addEventListener) return
			const context = doc.createElement('canvas').getContext('2d')
			if (!context) return
			await Promise.all([
				installMeasureContext(createCanvasMeasureContext(context)),
				...allDefaultFontFaces.map((font) => this.editor.fonts.ensureFontIsLoaded(font)),
			])
			if (this.disposed) return
			this.context = context
			this.ready.set(true)
		} catch {
			// Canvas or pretext can be unavailable; the editor must remain usable through the DOM.
		}
	}

	private getDom() {
		return (this.dom ??= new TextManager(this.editor))
	}

	private getNative(opts: TLMeasureTextOpts | TLMeasureTextSpanOpts) {
		if (!this.ready.get()) return
		this.fontEpoch.get()
		const doc = this.editor.getContainerDocument()
		if (doc.fonts.status !== 'loaded') return
		const extensions = this.editor.getTextOptions().tipTapConfig?.extensions
		if (extensions && extensions !== tipTapDefaultExtensions) return
		// Arbitrary CSS and custom rich text extensions can change geometry outside the engine.
		if (opts.otherStyles && Object.keys(opts.otherStyles).length) return
		if (typeof opts.padding === 'string' && !/^\d+(?:\.\d+)?(?:px)?$/.test(opts.padding)) return
		const match = /^var\(--tl-font-(draw|sans|serif|mono)\)$/.exec(opts.fontFamily)
		const family = match
			? DefaultFontFamilies[match[1] as keyof typeof DefaultFontFamilies]
			: opts.fontFamily
		if (family.includes('var(')) return
		const primaryFamily = family
			.split(',')[0]
			.trim()
			.replace(/^['"]|['"]$/g, '')
		if (
			!/^tldraw_(draw|sans|serif|mono)$/.test(primaryFamily) &&
			!['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(
				primaryFamily
			) &&
			![...doc.fonts].some((face) => face.family === primaryFamily && face.status === 'loaded')
		)
			return
		const font = `${opts.fontStyle} ${opts.fontWeight} ${opts.fontSize}px ${family}`
		if (!doc.fonts.check(font)) return
		// FontFaceSet.check succeeds for a missing family by using system fallback fonts.
		// Failed bundled font loads must not be cached as measurements of the intended font.
		if (!this.defaultFontsLoaded) {
			const loadedFonts = [...doc.fonts]
			this.defaultFontsLoaded = allDefaultFontFaces.every((face) =>
				loadedFonts.some(
					(loaded) =>
						loaded.family === face.family &&
						loaded.weight === (face.weight ?? 'normal') &&
						loaded.style === (face.style ?? 'normal') &&
						loaded.status === 'loaded'
				)
			)
			if (!this.defaultFontsLoaded) return
		}
		return (this.native ??= createTldrawTextMeasurer({
			measureContext: createCanvasMeasureContext(this.context!),
			extensions,
		}))
	}

	private tryNative<T>(
		opts: TLMeasureTextOpts | TLMeasureTextSpanOpts,
		measure: (native: TldrawTextMeasurer) => T
	): T | undefined {
		try {
			const native = this.getNative(opts)
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

	measureHtml(html: string, opts: TLMeasureTextOpts): TLMeasuredTextSize {
		const result =
			opts.richText && supportsRichText(opts.richText as JSONContent)
				? this.tryNative(opts, (native) => native.measureHtml(html, opts))
				: undefined
		return result ?? this.getDom().measureHtml(html, opts)
	}

	measureHtmlBatch(requests: BatchMeasurementRequest[]): TLMeasuredTextSize[] {
		const results: TLMeasuredTextSize[] = new Array(requests.length)
		const fallback: BatchMeasurementRequest[] = []
		const indices: number[] = []
		for (const [i, request] of requests.entries()) {
			const { html, opts } = request
			const result =
				opts.richText && supportsRichText(opts.richText as JSONContent)
					? this.tryNative(opts, (native) => native.measureHtml(html, opts))
					: undefined
			if (result) results[i] = result
			else {
				fallback.push(request)
				indices.push(i)
			}
		}
		if (fallback.length) {
			const measured = this.getDom().measureHtmlBatch(fallback)
			for (const [i, result] of measured.entries()) results[indices[i]] = result
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
