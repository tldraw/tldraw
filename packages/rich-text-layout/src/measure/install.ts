import type * as Pretext from '@chenglou/pretext'
import { MeasureContext, parseFontString } from './types'

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
		const font = parseFontString(this.font)
		const width = current.measure(text, font).width
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
 * Call this once before laying anything out; calling it again swaps the backend and clears
 * pretext's width caches. Layout functions are synchronous and throw if this has not resolved.
 *
 * @public
 */
export async function installMeasureContext(ctx: MeasureContext): Promise<void> {
	const previous = current
	current = ctx
	const mod = await loadPretext()
	if (previous !== null && previous !== ctx) mod.clearCache()
	captureIfNeeded(mod)
}

/**
 * Run a synchronous layout with `ctx` as pretext's measuring context. Layouts that pass their
 * own context would otherwise get pretext's segment widths from whichever context was installed
 * last, while fragment widths came from theirs. Swapping costs pretext its width caches, so a
 * context other than the installed one is correct but slow; the installed one is the fast path.
 *
 * @internal
 */
export function withMeasureContext<T>(ctx: MeasureContext, fn: () => T): T {
	if (ctx === current) return fn()
	const previous = current
	const mod = getPretext()
	current = ctx
	mod.clearCache()
	try {
		return fn()
	} finally {
		current = previous
		mod.clearCache()
	}
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
