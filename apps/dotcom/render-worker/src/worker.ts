/// <reference types="@cloudflare/workers-types" />
import { createSentry } from '@tldraw/worker-shared'
import { WorkerEntrypoint } from 'cloudflare:workers'
import {
	MeasureRequest,
	MeasureResult,
	RenderFailureReason,
	RenderWorkerRpc,
	ScreenshotRequest,
	ScreenshotResult,
} from './api'
import { BrowserRenderError, browserRenderContextOf, classifyScreenshotFailure } from './errors'
import { BrowserRender, compareScreenshotInShadow } from './headlessShadow'
import { readMeasureResult, runRenderSession } from './render'
import { Environment } from './types'

/**
 * The private render worker. Rendering is reached only through the RENDER_WORKER service binding;
 * over HTTP it serves the static render page and answers everything else with a 404 (see `fetch`
 * below). Everything it needs arrives in the RPC payload; it never fetches a snapshot, holds a token,
 * or sees a board slug.
 */
export class RenderWorker extends WorkerEntrypoint<Environment> implements RenderWorkerRpc {
	async screenshot(request: ScreenshotRequest): Promise<ScreenshotResult> {
		const { payload, telemetry, shadow } = request
		let browser: BrowserRender
		try {
			const { buffer, durationMs } = await runRenderSession(this.env, {
				session: {
					source: telemetry.source,
					mode: 'screenshot',
					reason: telemetry.reason,
					capture: payload.renderParams.capture,
				},
				payload,
				content: telemetry.content,
			})
			browser = { ok: true, png: new Uint8Array(buffer), browserMs: durationMs }
		} catch (error) {
			// The ledger write already happened at the choke point for a session that existed; here we
			// report the detail (Browser Run status/body/budget) to our own Sentry and hand sync-worker the
			// bounded reason for its request-level event.
			this.reportRenderError(error)
			browser = {
				ok: false,
				reason: classifyScreenshotFailure(error) as RenderFailureReason,
				browserMs: error instanceof BrowserRenderError ? error.durationMs : 0,
			}
		}
		// After the answer, never in its way: see headlessShadow.ts.
		if (shadow && this.env.HEADLESS_WORKER) {
			this.ctx.waitUntil(
				compareScreenshotInShadow(this.env, { payload, content: telemetry.content }, browser)
			)
		}
		return browser.ok ? { ok: true, png: browser.png } : { ok: false, reason: browser.reason }
	}

	async measure(request: MeasureRequest): Promise<MeasureResult> {
		const { payload, telemetry } = request
		try {
			const { buffer } = await runRenderSession(this.env, {
				session: { source: telemetry.source, mode: 'measure', reason: telemetry.reason },
				payload,
				content: telemetry.content,
			})
			return { ok: true, measurements: readMeasureResult(buffer) }
		} catch (error) {
			this.reportRenderError(error)
			return { ok: false, reason: classifyScreenshotFailure(error) as RenderFailureReason }
		}
	}

	// The render detail that stays out of the bounded reason code — Browser Run's status and body, or
	// the render page's own message — goes to this worker's Sentry as event context, never over the
	// RPC boundary. Failure-proof: reporting must never be the thing that throws. Falls back to a log
	// when there is no execution context or Sentry is unconfigured (createSentry throws without a DSN).
	private reportRenderError(error: unknown) {
		// Computed outside the try so it is in scope for the catch's fallback log too.
		const context = browserRenderContextOf(error) ?? {}
		try {
			const sentry = this.ctx ? createSentry(this.ctx, this.env) : null
			if (!sentry) {
				console.error('[render-worker]', context, error)
				return
			}
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			sentry.withScope((scope) => {
				scope.setExtras(context)
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				sentry.captureException(error)
			})
		} catch {
			// createSentry throws on a deployed worker with no DSN, and withScope/captureException can
			// throw too. The render detail must still surface, so log it rather than swallow. Never
			// rethrow: reporting runs on an already-failing path and must not turn a handled failure into
			// an unhandled one.
			console.error('[render-worker]', context, error)
		}
	}

	// The render page is served as static assets, ahead of this handler; nothing else is public. A
	// service-binding RPC worker needs no fetch handler, but an explicit 404 makes a stray direct
	// request fail cleanly rather than ambiguously.
	override async fetch(): Promise<Response> {
		return new Response('Not found', { status: 404 })
	}
}

export default RenderWorker
