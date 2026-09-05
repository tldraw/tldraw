import type * as Pretext from '@chenglou/pretext'
import { FontSpec, MeasureContext, fontSpecToString, parseFontString } from './types'

type PretextModule = typeof Pretext

let current: MeasureContext | null = null
let pretext: PretextModule | null = null
let pretextPromise: Promise<PretextModule> | null = null
let shimCalls = 0

/**
 * The canvas-2D surface pretext needs. It sets `font`, optionally `letterSpacing`, and calls
 * `measureText(...).width`; everything routes to the installed context.
 */
class ShimContext2D {
	font = '10px sans-serif'
	letterSpacing = '0px'
	measureText(text: string) {
		shimCalls++
		if (!current) {
			throw new Error('@tldraw/rich-text-layout: no MeasureContext installed')
		}
		const { font, context } = resolveTaggedFont(this.font)
		const width = context.measure(text, font).width
		// pretext calibrates emoji widths by comparing canvas against a DOM span whenever a
		// `document` exists. Under jsdom that span has no layout, so the "correction" would be
		// the whole emoji width. Reporting the probe glyph at no more than 1em keeps pretext
		// from calibrating; colour emoji fonts advance 1em anyway, so nothing is lost.
		if (text === EMOJI_PROBE && hasLayoutlessDocument()) {
			return { width: Math.min(width, font.size) }
		}
		return { width }
	}
}

// pretext caches widths by font string and measures through one global context. Tagging the
// font string with the context it belongs to keys those caches per context and lets the shim
// route each measurement, so several backends can coexist in one process.
const TAG_PREFIX = '__rtl_ctx_'
const TAG_RE = /,\s*__rtl_ctx_(\d+)__$/
const tagsByContext = new WeakMap<MeasureContext, string>()
const contextsByTag = new Map<string, MeasureContext>()
const taggedFontCache = new Map<string, { font: FontSpec; context: MeasureContext }>()
let nextTag = 1

/** @internal */
export function pretextFontString(font: FontSpec, ctx: MeasureContext): string {
	let tag = tagsByContext.get(ctx)
	if (!tag) {
		tag = `${TAG_PREFIX}${nextTag++}__`
		tagsByContext.set(ctx, tag)
		contextsByTag.set(tag, ctx)
	}
	return `${fontSpecToString(font)}, ${tag}`
}

function resolveTaggedFont(fontString: string): { font: FontSpec; context: MeasureContext } {
	let entry = taggedFontCache.get(fontString)
	if (entry) return entry
	const match = TAG_RE.exec(fontString)
	const context = (match && contextsByTag.get(`${TAG_PREFIX}${match[1]}__`)) || current
	if (!context) throw new Error('@tldraw/rich-text-layout: no MeasureContext installed')
	const font = parseFontString(match ? fontString.slice(0, match.index) : fontString)
	entry = { font, context }
	taggedFontCache.set(fontString, entry)
	return entry
}

const EMOJI_PROBE = '\u{1F600}'
let layoutlessDocument: boolean | null = null

function hasLayoutlessDocument() {
	if (layoutlessDocument !== null) return layoutlessDocument
	const g = globalThis as { document?: { body?: { getBoundingClientRect?(): { width: number } } } }
	const body = g.document?.body
	if (!body || typeof body.getBoundingClientRect !== 'function') {
		layoutlessDocument = false
	} else {
		layoutlessDocument = body.getBoundingClientRect().width === 0
	}
	return layoutlessDocument
}

class ShimOffscreenCanvas {
	private ctx = new ShimContext2D()
	constructor(
		public width: number,
		public height: number
	) {}
	getContext(type: string) {
		return type === '2d' ? this.ctx : null
	}
}

/**
 * Install the measurement backend and load pretext bound to it.
 *
 * pretext grabs `OffscreenCanvas` (or a DOM canvas) the first time it measures and keeps that
 * context forever, with no injection API, so the installer swaps in a shim canvas just long
 * enough for pretext to capture one. Everything pretext measures then goes through the installed
 * context.
 *
 * Call this once before laying anything out; calling it again changes the default backend.
 * Layout functions are synchronous and throw if this has not resolved.
 *
 * @public
 */
export async function installMeasureContext(ctx: MeasureContext): Promise<void> {
	current = ctx
	const mod = await loadPretext()
	captureIfNeeded(mod)
}

function loadPretext(): Promise<PretextModule> {
	if (pretext) return Promise.resolve(pretext)
	if (!pretextPromise) {
		pretextPromise = import('@chenglou/pretext').then((mod) => {
			pretext = mod
			return mod
		})
	}
	return pretextPromise
}

let captured = false

function captureIfNeeded(mod: PretextModule) {
	if (captured) return
	const g = globalThis as { OffscreenCanvas?: unknown }
	const hadOwn = Object.prototype.hasOwnProperty.call(g, 'OffscreenCanvas')
	const previous = g.OffscreenCanvas
	g.OffscreenCanvas = ShimOffscreenCanvas
	try {
		const before = shimCalls
		// A non-empty prepare forces pretext to resolve its measuring context. Pretext caches
		// per font string, so use a font nobody else will, and clear afterwards.
		mod.prepare('x', '1px __rich_text_layout_probe__')
		if (shimCalls === before) {
			throw new Error(
				'@tldraw/rich-text-layout: pretext already bound to another canvas. Install the measure context before anything else measures text with pretext.'
			)
		}
		mod.clearCache()
		captured = true
	} finally {
		if (hadOwn) g.OffscreenCanvas = previous
		else delete g.OffscreenCanvas
	}
}

/**
 * The installed measure context.
 *
 * @public
 */
export function getMeasureContext(): MeasureContext {
	if (!current) {
		throw new Error(
			'@tldraw/rich-text-layout: no MeasureContext installed. Call installMeasureContext() first.'
		)
	}
	return current
}

/** @internal */
export function getPretext(): PretextModule {
	if (!pretext || !captured) {
		throw new Error(
			'@tldraw/rich-text-layout: pretext is not loaded. Await installMeasureContext() before laying out text.'
		)
	}
	return pretext
}

/**
 * Whether `installMeasureContext` has completed.
 *
 * @public
 */
export function isMeasureContextReady(): boolean {
	return current !== null && pretext !== null && captured
}
