import {
	atom,
	DefaultFontFamilies,
	Editor,
	EditorManager,
	TLMeasureTextOpts,
	TLMeasureTextSpanOpts,
} from '@tldraw/editor'
import {
	createCanvasMeasureContext,
	installMeasureContext,
	releaseMeasureContext,
	MeasureContext,
} from '@tldraw/rich-text-layout'
import { allDefaultFontFaces } from '../../shapes/shared/defaultFonts'
import { createTldrawTextMeasurer, TldrawTextMeasurer } from './createTldrawTextMeasurer'
import { tipTapDefaultExtensions } from './richText'

export class PretextTextMeasurer extends EditorManager {
	private readonly ready = atom('native text measurement ready', false)
	private readonly fontEpoch = atom('native text measurement fonts', 0)
	private installedContext: MeasureContext | undefined
	private native: TldrawTextMeasurer | undefined
	private context: CanvasRenderingContext2D | undefined
	private disposed = false
	private defaultFontsLoaded = false

	constructor(editor: Editor) {
		super(editor)
		const fonts = editor.getContainerDocument().fonts
		const invalidateFonts = () => {
			// Both canvas and pretext cache font widths. A new context isolates the old caches.
			if (this.native) releaseMeasureContext(this.native.measureContext)
			this.native = undefined
			this.defaultFontsLoaded = false
			this.fontEpoch.update((epoch) => epoch + 1)
		}
		fonts?.addEventListener?.('loading', invalidateFonts)
		fonts?.addEventListener?.('loadingdone', invalidateFonts)
		fonts?.addEventListener?.('loadingerror', invalidateFonts)
		this.register(() => {
			this.disposed = true
			this.ready.set(false)
			if (this.native) releaseMeasureContext(this.native.measureContext)
			if (this.installedContext) releaseMeasureContext(this.installedContext)
			this.native = undefined
			this.installedContext = undefined
			this.context = undefined
			fonts?.removeEventListener?.('loading', invalidateFonts)
			fonts?.removeEventListener?.('loadingdone', invalidateFonts)
			fonts?.removeEventListener?.('loadingerror', invalidateFonts)
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
			this.installedContext = createCanvasMeasureContext(context)
			await Promise.all([
				installMeasureContext(this.installedContext),
				...allDefaultFontFaces.map((font) => this.editor.fonts.ensureFontIsLoaded(font)),
			])
			if (this.disposed) return
			this.context = context
			this.ready.set(true)
		} catch {
			// Canvas or pretext can be unavailable; the editor must remain usable through the DOM.
		}
	}

	getMeasurer(opts: TLMeasureTextOpts | TLMeasureTextSpanOpts) {
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
}
