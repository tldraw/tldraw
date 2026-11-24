import { RenderContentSummary, RenderFailureReason, RenderPayload } from './api'
import { writeDataPoint } from './render'
import { Environment } from './types'

// Shadow mode for the headless editor's screenshot path. Browser Run's PNG has already gone back to
// sync-worker; this sends the same payload and that PNG to the headless worker's `compare`, which
// draws the board and diffs the two, and records the result. The measure arm of the same comparison
// lives in sync-worker's headlessShadow.ts; see "Headless rendering and shadow comparison" in
// browser-run-thumbnails.md.
//
// Runs only in `ctx.waitUntil`, and swallows every failure into a telemetry row, so it can never
// change or delay a render. Inert unless HEADLESS_WORKER is bound (staging only) and sync-worker's
// `headless_shadow` flag picked the board.

/** The headless worker's `compare` call, copied from its own contract. Keep them in step by hand. */
export interface HeadlessCompareRequest {
	payload: RenderPayload
	/** Browser Run's PNG. Absent when it failed, so only the outcomes are compared. */
	reference?: Uint8Array
}

/** `diff` is the fraction of pixels that differ, or null with no readable reference. */
export type HeadlessCompareResult =
	| { ok: true; diff: { fair: number; strict: number } | null }
	| { ok: false; reason: string }

export interface HeadlessWorkerRpc {
	compare(request: HeadlessCompareRequest): Promise<HeadlessCompareResult>
}

/** What Browser Run did with the render the shadow is compared against. */
export type BrowserRender =
	| { ok: true; png: Uint8Array; browserMs: number }
	| { ok: false; reason: RenderFailureReason; browserMs: number }

// A warm headless render is ~100 ms and the decode and diff ~70 ms, but images are fetched, so this
// is generous. It bounds how long a stuck call can hold the isolate, not a render anyone waits for.
const SHADOW_COMPARE_TIMEOUT_MS = 20_000

/**
 * Compares the headless editor's render of `payload` with Browser Run's and writes one
 * `render_shadow_compare` row. Call only inside `ctx.waitUntil`.
 */
export async function compareScreenshotInShadow(
	env: Environment,
	{ payload, content }: { payload: RenderPayload; content: RenderContentSummary },
	browser: BrowserRender
): Promise<void> {
	const headless = env.HEADLESS_WORKER
	if (!headless) return
	const startedAt = Date.now()
	let timer: ReturnType<typeof setTimeout> | undefined
	let result: HeadlessCompareResult | 'timeout'
	try {
		result = await Promise.race([
			headless.compare({ payload, reference: browser.ok ? browser.png : undefined }),
			new Promise<'timeout'>((resolve) => {
				timer = setTimeout(() => resolve('timeout'), SHADOW_COMPARE_TIMEOUT_MS)
			}),
		])
	} catch (error) {
		console.error('[render-worker] headless compare failed', error)
		result = { ok: false, reason: 'rpc_error' }
	} finally {
		clearTimeout(timer)
	}
	// The RPC's wall time: the headless render plus the decode and diff. The headless worker can't
	// time itself, since a Worker's clock stands still between I/O.
	const compareMs = Date.now() - startedAt
	const headlessReason = result === 'timeout' ? 'timeout' : result.ok ? 'ok' : result.reason
	const diff = result !== 'timeout' && result.ok ? result.diff : null
	writeShadowCompareTelemetry(env, {
		outcome: outcomeOf(browser.ok, headlessReason),
		browser: browser.ok ? 'ok' : browser.reason,
		headless: headlessReason,
		diff,
		browserMs: browser.browserMs,
		compareMs,
		content,
	})
}

/** Whether the two agreed on drawing the board at all, which is what decides the cutover. */
function outcomeOf(browserOk: boolean, headless: string) {
	// The call never reached a render, most often a board whose payload plus the PNG passed the 32 MiB
	// RPC cap, so it says nothing about headless.
	if (headless === 'rpc_error') return 'compare_failed'
	const headlessOk = headless === 'ok'
	if (browserOk && headlessOk) return 'ok'
	if (browserOk) return 'headless_failed'
	if (headlessOk) return 'browser_failed'
	return 'both_failed'
}

// The same event as sync-worker's measure shadow, told apart by `op`. blob1–5 line up with it (name,
// worker, op, reference, outcome); the doubles are positional and mean something else per `op`, so
// every panel filters on `op`. Screenshot doubles, whose order must not change: [fair, strict,
// browserMs, compareMs, records, pageShapes, mediaAssets, imageMegapixels], with -1 for a diff that
// wasn't made. No board identity.
function writeShadowCompareTelemetry(
	env: Environment,
	{
		outcome,
		browser,
		headless,
		diff,
		browserMs,
		compareMs,
		content,
	}: {
		outcome: string
		browser: string
		headless: string
		diff: { fair: number; strict: number } | null
		browserMs: number
		compareMs: number
		content: RenderContentSummary
	}
) {
	writeDataPoint(env.MEASURE, env.WORKER_NAME, 'render_shadow_compare', {
		blobs: [
			'op:screenshot',
			'reference:browser_run',
			`outcome:${outcome}`,
			`browser:${browser}`,
			`headless:${headless}`,
		],
		doubles: [
			diff?.fair ?? -1,
			diff?.strict ?? -1,
			browserMs,
			compareMs,
			content.records,
			content.pageShapes,
			content.mediaAssets,
			content.imageMegapixels,
		],
	})
}
