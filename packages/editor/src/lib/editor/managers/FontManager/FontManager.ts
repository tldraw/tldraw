import { computed, EMPTY_ARRAY, transact } from '@tldraw/state'
import { AtomMap } from '@tldraw/store'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import {
	areArraysShallowEqual,
	compact,
	FileHelpers,
	mapObjectMapValues,
	objectMapEntries,
} from '@tldraw/utils'
import { Editor } from '../../Editor'

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
	readonly family: string
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
			{
				areResultsEqual: areArraysShallowEqual,
				areRecordsEqual: (a, b) => a.props === b.props && a.meta === b.meta,
			}
		)

		this.shapeFontLoadStateCache = editor.store.createCache<(FontState | null)[], TLShape>(
			(id: TLShapeId) => {
				const fontFacesComputed = computed('font faces', () => this.getShapeFontFaces(id))
				return computed(
					'font load state',
					() => {
						const states = fontFacesComputed.get().map((face) => this.getFontState(face))
						return states
					},
					{ isEqual: areArraysShallowEqual }
				)
			}
		)
	}

	private readonly shapeFontFacesCache
	private readonly shapeFontLoadStateCache

	getShapeFontFaces(shape: TLShape | TLShapeId): TLFontFace[] {
		const shapeId = typeof shape === 'string' ? shape : shape.id
		return this.shapeFontFacesCache.get(shapeId) ?? EMPTY_ARRAY
	}

	trackFontsForShape(shape: TLShape | TLShapeId) {
		const shapeId = typeof shape === 'string' ? shape : shape.id
		this.shapeFontLoadStateCache.get(shapeId)
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

	private readonly fontStates = new AtomMap<TLFontFace, FontState>('font states')
	private getFontState(font: TLFontFace): FontState | null {
		return this.fontStates.get(font) ?? null
	}

	ensureFontIsLoaded(font: TLFontFace): Promise<void> {
		const existingState = this.getFontState(font)
		if (existingState) return existingState.loadingPromise

		const instance = this.findOrCreateFontFace(font)
		const state: FontState = {
			state: 'loading',
			instance,
			loadingPromise: instance
				.load()
				.then(() => {
					document.fonts.add(instance)
					this.fontStates.update(font, (s) => ({ ...s, state: 'ready' }))
				})
				.catch((err) => {
					console.error(err)
					this.fontStates.update(font, (s) => ({ ...s, state: 'error' }))
				}),
		}

		this.fontStates.set(font, state)
		return state.loadingPromise
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
				existing.family === font.family &&
				objectMapEntries(defaultFontFaceDescriptors).every(
					([key, defaultValue]) => existing[key] === (font[key] ?? defaultValue)
				)
			) {
				return existing
			}
		}

		const url = this.assetUrls?.[font.src.url] ?? font.src.url
		const instance = new FontFace(font.family, `url(${JSON.stringify(url)})`, {
			...mapObjectMapValues(defaultFontFaceDescriptors, (key) => font[key]),
			display: 'swap',
		})

		document.fonts.add(instance)

		return instance
	}

	async toEmbeddedCssDeclaration(font: TLFontFace) {
		const url = this.assetUrls?.[font.src.url] ?? font.src.url
		const dataUrl = await FileHelpers.urlToDataUrl(url)

		const src = compact([
			`url("${dataUrl}")`,
			font.src.format ? `format(${font.src.format})` : null,
			font.src.tech ? `tech(${font.src.tech})` : null,
		]).join(' ')
		return compact([
			`@font-face {`,
			`  font-family: "${font.family}";`,
			font.ascentOverride ? `  ascent-override: ${font.ascentOverride};` : null,
			font.descentOverride ? `  descent-override: ${font.descentOverride};` : null,
			font.stretch ? `  font-stretch: ${font.stretch};` : null,
			font.style ? `  font-style: ${font.style};` : null,
			font.weight ? `  font-weight: ${font.weight};` : null,
			font.featureSettings ? `  font-feature-settings: ${font.featureSettings};` : null,
			font.lineGapOverride ? `  line-gap-override: ${font.lineGapOverride};` : null,
			font.unicodeRange ? `  unicode-range: ${font.unicodeRange};` : null,
			`  src: ${src};`,
			`}`,
		]).join('\n')
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
