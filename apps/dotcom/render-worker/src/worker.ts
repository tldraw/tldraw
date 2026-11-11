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
import { browserRenderContextOf, classifyScreenshotFailure } from './errors'
import { readMeasureResult, runRenderSession } from './render'
import { Environment } from './types'

/**
 * The private render worker. Reached only through the RENDER_WORKER service binding — no routes, so
 * direct HTTP gets a 404 (see `fetch` below). Everything it needs arrives in the RPC payload; it
 * never fetches a snapshot, holds a token, or sees a board slug.
 *
 * NOTE (core move, copy step): the render core was copied here from sync-worker's thumbnailRender.ts.
 * sync-worker's own copy and its call sites are left in place and still live — nothing is switched to
 * call this worker yet. The switchover (and the removal of the old path) is a later step.
 */
export class RenderWorker extends WorkerEntrypoint<Environment> implements RenderWorkerRpc {
	async screenshot(request: ScreenshotRequest): Promise<ScreenshotResult> {
		const { payload, telemetry } = request
		try {
			const { buffer } = await runRenderSession(this.env, {
				session: {
					source: telemetry.source,
					mode: 'screenshot',
					reason: telemetry.reason,
					capture: payload.renderParams.capture,
				},
				payload,
				content: telemetry.content,
			})
			return { ok: true, png: new Uint8Array(buffer) }
		} catch (error) {
			// The ledger write already happened at the choke point for a session that existed; here we
			// report the detail (Browser Run status/body/budget) to our own Sentry and hand sync-worker the
			// bounded reason for its request-level event.
			this.reportRenderError(error)
			return { ok: false, reason: classifyScreenshotFailure(error) as RenderFailureReason }
		}
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
			// createSentry throws when no DSN is configured — which is every deployed environment today
			// (staging/preview), not just dev — and withScope/captureException can throw too. The render
			// detail must still surface, so log it rather than swallow. Never rethrow: reporting runs on
			// an already-failing path and must not turn a handled failure into an unhandled one.
			console.error('[render-worker]', context, error)
		}
	}

	// No public surface. A service-binding RPC worker needs no fetch handler, but an explicit 404
	// documents the intent and makes a stray direct request fail cleanly rather than ambiguously.
	override async fetch(): Promise<Response> {
		return new Response('Not found', { status: 404 })
	}
}

export default RenderWorker
