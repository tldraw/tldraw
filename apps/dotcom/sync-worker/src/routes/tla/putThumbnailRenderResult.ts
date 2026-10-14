import { ThumbnailRenderTimingsRequestBody } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'

// The render page's phase-timing beacon. A signed token proves the POST comes from a render we asked
// for. Telemetry only — nothing downstream waits on it, so it is accepted for any valid token,
// screenshot or measure. Measure results come back in the page's HTML instead (see
// measurePageShapes).
export async function putThumbnailRenderResult(
	request: IRequest,
	env: Environment
): Promise<Response> {
	let body: ThumbnailRenderTimingsRequestBody
	try {
		body = (await request.json()) as ThumbnailRenderTimingsRequestBody
	} catch {
		return Response.json({ error: true, message: 'Invalid JSON body' }, { status: 400 })
	}

	// `typeof null` is 'object', and `null`, numbers and strings are valid JSON too; refused as the
	// caller's mistake here, where the property reads below would throw on them and escape as a
	// worker 500.
	if (
		!body ||
		typeof body !== 'object' ||
		!body.token ||
		!body.timings ||
		typeof body.timings !== 'object'
	) {
		return Response.json(
			{ error: true, message: 'token and timings are required' },
			{ status: 400 }
		)
	}
	// Signed and unexpired, but deliberately *not* minted-checked, unlike the snapshot route. An
	// MCP record is keyed per capture and deleted the moment the session returns (see
	// deleteMintedRenderToken), while the page sends this beacon and signals ready in the next
	// statement — so requiring the record would race the worker's own cleanup and lose the
	// timings for precisely the fastest renders, which is the wrong end to go blind at. The
	// signature is enough here because this route hands back no board data and nothing waits on
	// it: a forged token could only add noise to `render_page_timings`, which is already true of
	// every `public` job, where the minted check passes vacuously anyway.
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
