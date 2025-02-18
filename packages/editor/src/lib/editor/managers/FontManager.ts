import { atom, Atom, computed, EMPTY_ARRAY, transact } from '@tldraw/state'
import { createComputedCache } from '@tldraw/store'
import { TLShape } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import { Editor } from '../Editor'

/**
 * Represents the `src` property of a {@link FontFace}.
 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/src | `src`} for details of the properties here.
 */
export interface TLFontFaceSource {
	/**
	 * A URL from which to load the font. If the value here is a key in
	 * {@link TLEditorAssetUrls.fonts}, the value from there will be used instead.
	 */
	url: string
	format?: string
	tech?: string
}

/**
 * A font face that can be used in the editor. The properties of this are largely the same as the
 * ones in the
 * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face | css `@font-face` rule}.
 */
export interface TLFontFace {
	/**
	 * How this font can be referred to in CSS.
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-family | `font-family`}.
	 */
	readonly fontFamily: string
	/**
	 * The source of the font. This
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/src | `src`}.
	 */
	readonly src: TLFontFaceSource
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/ascent-override | `ascent-override`}.
	 */
	readonly ascentOverride?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/descent-override | `descent-override`}.
	 */
	readonly descentOverride?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-stretch | `font-stretch`}.
	 */
	readonly stretch?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-style | `font-style`}.
	 */
	readonly style?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-weight | `font-weight`}.
	 */
	readonly weight?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-feature-settings | `font-feature-settings`}.
	 */
	readonly featureSettings?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/line-gap-override | `line-gap-override`}.
	 */
	readonly lineGapOverride?: string
}

interface FontState {
	readonly state: 'loading' | 'ready' | 'error'
	readonly instance: FontFace
	readonly loadingPromise: Promise<void>
}

export class FontManager {
	static fontFaceToCss(font: TLFontFace, fontDisplay?: FontDisplay): string {
		return compact([
			`@font-face {`,
			`  font-family: ${font.fontFamily};`,
			`  src: ${font.src};`,
			fontDisplay ? `  font-display: ${fontDisplay};` : null,
			font.ascentOverride ? `  ascent-override: ${font.ascentOverride};` : null,
			font.descentOverride ? `  descent-override: ${font.descentOverride};` : null,
			font.stretch ? `  font-stretch: ${font.stretch};` : null,
			font.style ? `  font-style: ${font.style};` : null,
			font.weight ? `  font-weight: ${font.weight};` : null,
			font.featureSettings ? `  font-feature-settings: ${font.featureSettings};` : null,
			font.lineGapOverride ? `  line-gap-override: ${font.lineGapOverride};` : null,
			`}`,
		]).join('\n')
	}

	private fontStates = new Map<TLFontFace, Atom<FontState>>()

	constructor(
		private readonly editor: Editor,
		private readonly assetUrls?: Record<string, string>
	) {}

	@computed private getShapeFontFacesCache() {
		return createComputedCache('shape font faces', (editor: Editor, shape: TLShape) => {
			const shapeUtil = editor.getShapeUtil(shape)
			return shapeUtil.getFontFaces(shape)
		})
	}

	getShapeFontFaces(shape: TLShape): TLFontFace[] {
		return this.getShapeFontFacesCache().get(this.editor, shape.id) ?? EMPTY_ARRAY
	}

	@computed private shapeFontLoadStateCache() {
		return createComputedCache('shape font load state', (editor: Editor, shape: TLShape) => {
			const states = this.getShapeFontFaces(shape).map((face) => this.getFontState(face))
			return states
		})
	}
	trackFontsForShape(shape: TLShape) {
		this.shapeFontLoadStateCache().get(this.editor, shape.id)
	}

	async loadRequiredFontsForCurrentPage(limit = Infinity) {
		const neededFonts = new Set<TLFontFace>()
		for (const shapeId of this.editor.getCurrentPageShapeIds()) {
			for (const font of this.getShapeFontFaces(this.editor.getShape(shapeId)!)) {
				neededFonts.add(font)
			}
		}

		if (neededFonts.size > limit) {
			return
		}

		const promises = Array.from(neededFonts, (font) => this.ensureFontIsLoaded(font))
		await Promise.all(promises)
	}

	private missingFontAtom = atom('missing font tracker', 0)
	private getFontState(font: TLFontFace): FontState | null {
		const stateAtom = this.fontStates.get(font)
		if (!stateAtom) {
			// if we don't have a state for this font, listen to the missing font atom. When we add
			// a font, this will change and cause this to re-evaluate.
			this.missingFontAtom.get()
			return null
		}
		return stateAtom.get()
	}

	ensureFontIsLoaded(font: TLFontFace): Promise<void> {
		const state = this.getFontState(font)
		if (state) return state.loadingPromise

		const url = this.assetUrls?.[font.src.url] ?? font.src.url
		const instance = new FontFace(font.fontFamily, `url(${JSON.stringify(url)})`, {
			ascentOverride: font.ascentOverride,
			descentOverride: font.descentOverride,
			stretch: font.stretch,
			style: font.style,
			weight: font.weight,
			featureSettings: font.featureSettings,
			lineGapOverride: font.lineGapOverride,
			display: 'swap',
		})

		const stateAtom = atom<FontState>('font state', {
			state: 'loading',
			instance,
			loadingPromise: instance
				.load()
				.then(() => {
					console.log('font loaded', font)
					document.fonts.add(instance)
					stateAtom.update((s) => ({ ...s, state: 'ready' }))
				})
				.catch((err) => {
					console.error(err)
					stateAtom.update((s) => ({ ...s, state: 'error' }))
				}),
		})
		this.fontStates.set(font, stateAtom)
		this.missingFontAtom.update((n) => n + 1)
		return stateAtom.get().loadingPromise
	}

	fontsToLoad = new Set<TLFontFace>()
	requestFonts(fonts: TLFontFace[]) {
		if (!this.fontsToLoad.size) {
			queueMicrotask(() => {
				if (this.editor.isDisposed) return
				transact(() => {
					const toLoad = this.fontsToLoad
					this.fontsToLoad = new Set()
					for (const font of toLoad) {
						this.ensureFontIsLoaded(font)
					}
				})
			})
		}
		for (const font of fonts) {
			this.fontsToLoad.add(font)
		}
	}
}
