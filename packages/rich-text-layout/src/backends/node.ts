import { CanvasTextContextLike, createCanvasMeasureContext } from '../measure/canvas'
import { MeasureContext } from '../measure/types'

/** @public */
export type NodeFontSource =
	| {
			/** The CSS family name the font is registered under. */
			family: string
			/** Font file bytes. `@napi-rs/canvas` accepts ttf, otf, woff and woff2 directly. */
			data: Uint8Array
	  }
	| {
			family: string
			/** Path to a font file; collections (`.ttc`) load more reliably this way than from bytes. */
			path: string
	  }

/** @public */
export interface NodeMeasureContextOptions {
	fonts?: readonly NodeFontSource[]
	/** See `CanvasMeasureContextOptions.fallbackFamilies`; names registered through `fonts`. */
	fallbackFamilies?: readonly string[]
}

interface NapiCanvasModule {
	GlobalFonts: {
		register(data: Uint8Array, alias?: string): boolean
		registerFromPath(path: string, alias?: string): boolean
	}
	createCanvas(
		width: number,
		height: number
	): {
		getContext(type: '2d'): CanvasTextContextLike
	}
}

/**
 * A `MeasureContext` backed by `@napi-rs/canvas` (skia). Fonts are registered globally by
 * family name; the weight and style come from the font files themselves, so register every
 * face of a family under the same name.
 *
 * `@napi-rs/canvas` is an optional peer dependency and is only loaded when this is called.
 *
 * @public
 */
export async function createNodeMeasureContext(
	options: NodeMeasureContextOptions = {}
): Promise<MeasureContext> {
	// Resolved at runtime only: the package is an optional peer, and a literal specifier would
	// make browser bundlers try to resolve it when the core is bundled for the web.
	const specifier = '@napi-rs/canvas'
	const mod = (await import(
		/* @vite-ignore */ /* webpackIgnore: true */ specifier
	)) as NapiCanvasModule
	for (const font of options.fonts ?? []) {
		let ok: boolean
		if ('path' in font) {
			ok = mod.GlobalFonts.registerFromPath(font.path, font.family)
		} else {
			// skia reads the font file through the buffer it was given rather than copying it.
			// If that buffer is collected, every later measurement with the face silently
			// returns 0, so keep an owned copy alive for the life of the process (fonts are
			// global anyway).
			const data = new Uint8Array(font.data)
			retainedFontData.push(data)
			ok = mod.GlobalFonts.register(data, font.family)
		}
		if (!ok) {
			throw new Error(`@tldraw/rich-text-layout: could not register font "${font.family}"`)
		}
	}
	const canvas = mod.createCanvas(1, 1)
	const measure = createCanvasMeasureContext(canvas.getContext('2d'), {
		fallbackFamilies: options.fallbackFamilies,
	})
	retainedCanvases.set(measure, canvas)
	return measure
}

const retainedFontData: Uint8Array[] = []
const retainedCanvases = new WeakMap<MeasureContext, unknown>()
