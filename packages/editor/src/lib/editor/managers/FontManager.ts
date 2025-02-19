import { atom, Atom, EMPTY_ARRAY, transact } from '@tldraw/state'
import { TLShape } from '@tldraw/tlschema'
import { areArraysShallowEqual, compact } from '@tldraw/utils'
import { Editor } from '../Editor'

/**
 * Represents the `src` property of a {@link TLFontFace}.
 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/src | `src`} for details of the properties here.
 * @public
 */
export interface TLFontFaceSource {
	/**
	 * A URL from which to load the font. If the value here is a key in
	 * {@link tldraw#TLEditorAssetUrls.fonts}, the value from there will be used instead.
	 */
	url: string
	format?: string
	tech?: string
}

/**
 * A font face that can be used in the editor. The properties of this are largely the same as the
 * ones in the
 * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face | css `@font-face` rule}.
 * @public
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
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range | `unicode-range`}.
	 */
	readonly unicodeRange?: string
}

interface FontState {
	readonly state: 'loading' | 'ready' | 'error'
	readonly instance: FontFace
	readonly loadingPromise: Promise<void>
}

/** @public */
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
			font.unicodeRange ? `  unicode-range: ${font.unicodeRange};` : null,
			`}`,
		]).join('\n')
	}

	constructor(
		private readonly editor: Editor,
		private readonly assetUrls?: { [key: string]: string | undefined }
	) {
		this.shapeFontFacesCache = editor.store.createComputedCache(
			'shape font faces',
			(shape: TLShape) => {
				const shapeUtil = this.editor.getShapeUtil(shape)
				return shapeUtil.getFontFaces(shape)
			},
			{ areResultsEqual: areArraysShallowEqual }
		)

		this.shapeFontLoadStateCache = editor.store.createComputedCache(
			'shape font load state',
			(shape: TLShape) => {
				const states = this.getShapeFontFaces(shape).map((face) => this.getFontState(face))
				return states
			},
			{ areResultsEqual: areArraysShallowEqual }
		)
	}

	private readonly shapeFontFacesCache
	private readonly shapeFontLoadStateCache

	getShapeFontFaces(shape: TLShape): TLFontFace[] {
		return this.shapeFontFacesCache.get(shape.id) ?? EMPTY_ARRAY
	}

	trackFontsForShape(shape: TLShape) {
		this.shapeFontLoadStateCache.get(shape.id)
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

	private readonly fontStates = atom<ReadonlyMap<TLFontFace, Atom<FontState>>>(
		'font states',
		new Map()
	)
	private getFontState(font: TLFontFace): FontState | null {
		return this.fontStates.get().get(font)?.get() ?? null
	}

	ensureFontIsLoaded(font: TLFontFace): Promise<void> {
		const state = this.getFontState(font)
		if (state) return state.loadingPromise

		const instance = this.findOrCreateFontFace(font)
		const stateAtom = atom<FontState>('font state', {
			state: 'loading',
			instance,
			loadingPromise: instance
				.load()
				.then(() => {
					document.fonts.add(instance)
					stateAtom.update((s) => ({ ...s, state: 'ready' }))
				})
				.catch((err) => {
					console.error(err)
					stateAtom.update((s) => ({ ...s, state: 'error' }))
				}),
		})
		this.fontStates.update((map) => {
			const newMap = new Map(map)
			newMap.set(font, stateAtom)
			return newMap
		})

		return stateAtom.get().loadingPromise
	}

	private fontsToLoad = new Set<TLFontFace>()
	requestFonts(fonts: TLFontFace[]) {
		if (!this.fontsToLoad.size) {
			queueMicrotask(() => {
				if (this.editor.isDisposed) return
				const toLoad = this.fontsToLoad
				this.fontsToLoad = new Set()
				transact(() => {
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

	private findOrCreateFontFace(font: TLFontFace) {
		for (const existing of document.fonts) {
			if (
				existing.family === font.fontFamily &&
				existing.style === (font.style ?? defaultFontFaceDescriptors.style) &&
				existing.weight === (font.weight ?? defaultFontFaceDescriptors.weight) &&
				existing.stretch === (font.stretch ?? defaultFontFaceDescriptors.stretch) &&
				existing.unicodeRange === (font.unicodeRange ?? defaultFontFaceDescriptors.unicodeRange) &&
				existing.featureSettings ===
					(font.featureSettings ?? defaultFontFaceDescriptors.featureSettings) &&
				existing.ascentOverride ===
					(font.ascentOverride ?? defaultFontFaceDescriptors.ascentOverride) &&
				existing.descentOverride ===
					(font.descentOverride ?? defaultFontFaceDescriptors.descentOverride) &&
				existing.lineGapOverride ===
					(font.lineGapOverride ?? defaultFontFaceDescriptors.lineGapOverride)
			) {
				console.log('existing', font, existing)
				return existing
			}
		}

		const url = this.assetUrls?.[font.src.url] ?? font.src.url
		const instance = new FontFace(font.fontFamily, `url(${JSON.stringify(url)})`, {
			weight: font.weight,
			style: font.style,
			stretch: font.stretch,
			unicodeRange: font.unicodeRange,
			featureSettings: font.featureSettings,
			ascentOverride: font.ascentOverride,
			descentOverride: font.descentOverride,
			lineGapOverride: font.lineGapOverride,
			display: 'swap',
		})

		document.fonts.add(instance)

		return instance
	}
}

// From https://drafts.csswg.org/css-font-loading/#fontface-interface
const defaultFontFaceDescriptors = {
	style: 'normal',
	weight: 'normal',
	stretch: 'normal',
	unicodeRange: 'U+0-10FFFF',
	featureSettings: 'normal',
	ascentOverride: 'normal',
	descentOverride: 'normal',
	lineGapOverride: 'normal',
}
