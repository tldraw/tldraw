import { computed, EMPTY_ARRAY, transact } from '@tldraw/state'
import { AtomMap } from '@tldraw/store'
import { TLFontFace, TLShape, TLShapeId } from '@tldraw/tlschema'
import {
	areArraysShallowEqual,
	compact,
	FileHelpers,
	mapObjectMapValues,
	objectMapEntries,
} from '@tldraw/utils'
import type { Editor } from '../../Editor'

interface FontState {
	readonly state: 'loading' | 'ready' | 'error'
	readonly instance: FontFace
	readonly loadingPromise: Promise<void>
}

interface ShapeFontFacesCache {
	get(id: TLShapeId): TLFontFace[] | undefined
}

interface ShapeFontLoadStateCache {
	get(id: TLShapeId): (FontState | null)[] | undefined
}

const EMPTY_SHAPE_FONT_FACES_CACHE: ShapeFontFacesCache = { get: () => undefined }
const EMPTY_SHAPE_FONT_LOAD_STATE_CACHE: ShapeFontLoadStateCache = { get: () => undefined }

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

	dispose() {
		this.fontStates.clear()
		this.fontsToLoad.clear()
		this.shapeFontFacesCache = EMPTY_SHAPE_FONT_FACES_CACHE
		this.shapeFontLoadStateCache = EMPTY_SHAPE_FONT_LOAD_STATE_CACHE
	}

	private shapeFontFacesCache: ShapeFontFacesCache
	private shapeFontLoadStateCache: ShapeFontLoadStateCache

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
		const updateState = (updater: (state: FontState) => FontState) => {
			if (this.fontStates.__unsafe__getWithoutCapture(font) !== state) return false
			this.fontStates.update(font, updater)
			return true
		}
		const state: FontState = {
			state: 'loading',
			instance,
			loadingPromise: instance
				.load()
				.then(() => {
					if (this.fontStates.__unsafe__getWithoutCapture(font) !== state) return
					this.editor.getContainerDocument().fonts.add(instance)
					updateState((s) => ({ ...s, state: 'ready' }))
				})
				.catch((err) => {
					if (this.fontStates.__unsafe__getWithoutCapture(font) !== state) return
					console.error(err)
					updateState((s) => ({ ...s, state: 'error' }))
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
		const containerDocument = this.editor.getContainerDocument()

		// `findOrCreateFontFace` runs for every font on every editor mount, and a fresh
		// editor (e.g. switching documents) gets a fresh FontManager with no memory of the
		// previous one. The dedup below is an O(n) scan of the document's whole FontFaceSet,
		// so without a cache that scan re-ran on every mount (measurably expensive on mobile
		// Safari). Cache the resolved FontFace per document so repeated lookups - and
		// remounts - are O(1). Keyed per document for cross-window embedding.
		let cache = fontFaceCacheByDocument.get(containerDocument)
		if (!cache) {
			cache = new Map()
			fontFaceCacheByDocument.set(containerDocument, cache)
		}
		const key = getFontFaceCacheKey(font)
		const cached = cache.get(key)
		if (cached) return cached

		const fonts = containerDocument.fonts
		// On a cache miss we still scan once, so font faces added outside this manager
		// (e.g. preloaded fonts) are reused rather than duplicated.
		for (const existing of fonts) {
			if (
				existing.family === font.family &&
				objectMapEntries(defaultFontFaceDescriptors).every(
					([key, defaultValue]) => existing[key] === (font[key] ?? defaultValue)
				)
			) {
				cache.set(key, existing)
				return existing
			}
		}

		const url = this.assetUrls?.[font.src.url] ?? font.src.url
		const instance = new FontFace(font.family, `url(${JSON.stringify(url)})`, {
			...mapObjectMapValues(defaultFontFaceDescriptors, (key) => font[key]),
			display: 'swap',
		})

		fonts.add(instance)
		cache.set(key, instance)

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

// A FontFace is fully determined by its family and descriptors, so resolved faces can be
// cached per document and reused across FontManager instances (e.g. editor remounts),
// turning the per-lookup FontFaceSet scan into an O(1) map lookup. Faces are never removed
// from `document.fonts` (FontManager.dispose leaves them), so the cache stays valid for the
// document's lifetime. Keyed per document for cross-window embedding.
let fontFaceCacheByDocument = new WeakMap<Document, Map<string, FontFace>>()

function getFontFaceCacheKey(font: TLFontFace): string {
	return JSON.stringify([
		font.family,
		...objectMapEntries(defaultFontFaceDescriptors).map(
			([key, defaultValue]) => font[key] ?? defaultValue
		),
	])
}

/**
 * Resets the per-document font-face cache. Only intended for tests.
 * @internal
 */
export function clearFontFaceCacheForTests() {
	fontFaceCacheByDocument = new WeakMap()
}
