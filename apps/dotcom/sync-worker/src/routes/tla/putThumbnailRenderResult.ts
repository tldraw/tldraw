import {
	THUMBNAIL_RENDER_ERROR_MAX_LENGTH,
	THUMBNAIL_RENDER_PHASES,
	ThumbnailRenderErrorRequestBody,
	ThumbnailRenderTimingsRequestBody,
} from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { RenderPageError, reportThumbnailError } from './thumbnailShared'

// The render page's beacons: phase timings on success, its own error on failure. A signed token
// proves the POST comes from a render we asked for. Telemetry only — nothing downstream waits on
// either, so both are accepted for any valid token, screenshot or measure. Measure results come back
// in the page's HTML instead (see measurePageShapes).
//
// Signed and unexpired, but deliberately *not* minted-checked, unlike the snapshot route. An MCP
// record is keyed per capture and deleted the moment the session returns (see
// deleteMintedRenderToken), while the page sends a beacon and ends the session in the next
// statement — so requiring the record would race the worker's own cleanup and lose the beacon for
// precisely the fastest renders, which is the wrong end to go blind at. The signature is enough
// because this route hands back no board data and nothing waits on it: a forged token could only add
// noise to telemetry, which is already true of every `public` job, where the minted check passes
// vacuously anyway.
export async function putThumbnailRenderResult(
	request: IRequest,
	env: Environment,
	ctx?: ExecutionContext
): Promise<Response> {
	let body: ThumbnailRenderTimingsRequestBody | ThumbnailRenderErrorRequestBody
	try {
		body = (await request.json()) as
			| ThumbnailRenderTimingsRequestBody
			| ThumbnailRenderErrorRequestBody
	} catch {
		return Response.json({ error: true, message: 'Invalid JSON body' }, { status: 400 })
	}

	// `null`, numbers and strings are valid JSON too; refused as the caller's mistake here, where
	// the `in` and property checks below would throw on them and escape as a worker 500.
	if (!body || typeof body !== 'object') {
		return Response.json({ error: true, message: 'Invalid JSON body' }, { status: 400 })
	}

	if ('error' in body) {
		const { message, phase } = body.error ?? {}
		if (!body.token || typeof message !== 'string' || !THUMBNAIL_RENDER_PHASES.includes(phase)) {
			return Response.json(
				{ error: true, message: 'token, error.message and error.phase are required' },
				{ status: 400 }
			)
		}
		const job = await verifyThumbnailRenderToken(env, body.token)
		if (!job) {
			return Response.json({ error: true, message: 'Invalid render token' }, { status: 403 })
		}
		const surface = job.surface ?? 'og'
		const mode = job.mode ?? 'screenshot'
		// The message goes to Sentry only: it is free text, and Analytics Engine blobs must stay
		// bounded.
		writeDataPoint(undefined, env.MEASURE, env, 'render_page_error', {
			blobs: [`surface:${surface}`, `mode:${mode}`, `phase:${phase}`],
		})
		reportThumbnailError(
			new RenderPageError({ detail: message.slice(0, THUMBNAIL_RENDER_ERROR_MAX_LENGTH), phase }),
			{
				ctx,
				env,
				surface: 'render_page',
				extras: {
					render_surface: surface,
					render_mode: mode,
					// Matches browser_run_session, where a measure draws nothing: `capture:none`.
					render_capture: mode === 'measure' ? 'none' : (job.capture ?? 'export'),
				},
			}
		)
		return Response.json({ error: false })
	}

	// `typeof null` is 'object', and these timings get destructured below.
	if (!body.token || !body.timings || typeof body.timings !== 'object') {
		return Response.json(
			{ error: true, message: 'token and timings are required' },
			{ status: 400 }
		)
	}
	const job = await verifyThumbnailRenderToken(env, body.token)
	if (!job) {
		return Response.json({ error: true, message: 'Invalid render token' }, { status: 403 })
	}
	const { bootAt, dataAt, mountAt, settledAt, exportedAt } = body.timings
	const stamps = [bootAt, dataAt, mountAt, settledAt, exportedAt]
	if (!stamps.every(Number.isFinite)) {
		return Response.json({ error: true, message: 'timings must be finite' }, { status: 400 })
	}
	// One datapoint per completed export: where the in-browser time went. browser_run_session
	// prices the whole session; this decomposes it into boot / acquire / mount / settle / export,
	// which is what ranks the render page's optimisations against each other.
	// `acquired:` is appended, and bounded here rather than trusted: the beacon is signed but not
	// minted-checked, so its body is caller-shaped.
	const acquiredBy =
		body.acquiredBy === 'push' || body.acquiredBy === 'fetch' ? body.acquiredBy : 'unknown'
	writeDataPoint(undefined, env.MEASURE, env, 'render_page_timings', {
		blobs: [`surface:${job.surface ?? 'og'}`, `acquired:${acquiredBy}`],
		doubles: stamps,
	})
	return Response.json({ error: false })
}
