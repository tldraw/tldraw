import { ThumbnailRenderResultRequestBody } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { ShapeMeasurement } from './boardTools'
import { putRenderResult } from './thumbnailRender'

// How measurements get out of the browser.
//
// Browser Rendering hands the Worker pixels, not JSON, so a render page asked to measure a page has
// to push its answer back. It POSTs here before signalling ready, and the Worker — still blocked on
// its own screenshot call — picks the result up as soon as that returns.
//
// Scoped to the signed job: the storage key is the token, so a result can only ever reach the render
// that asked for it.
export async function putThumbnailRenderResult(
	request: IRequest,
	env: Environment
): Promise<Response> {
	let body: ThumbnailRenderResultRequestBody
	try {
		body = (await request.json()) as ThumbnailRenderResultRequestBody
	} catch {
		return Response.json({ error: true, message: 'Invalid JSON body' }, { status: 400 })
	}

	if (!body?.token || !body.bounds || typeof body.bounds !== 'object') {
		return Response.json({ error: true, message: 'token and bounds are required' }, { status: 400 })
	}

	const job = await verifyThumbnailRenderToken(env, body.token)
	// The mode is inside the signed payload, so a screenshot token can't be replayed to post a result.
	if (!job || job.mode !== 'measure') {
		return Response.json({ error: true, message: 'Invalid render token' }, { status: 403 })
	}

	const bounds: Record<string, ShapeMeasurement> = {}
	for (const [shapeId, box] of Object.entries(body.bounds)) {
		// A non-finite value would produce NaN distances and silently detach that shape from the
		// minimum spanning tree, so anything malformed is dropped rather than stored.
		if (
			!Number.isFinite(box?.x) ||
			!Number.isFinite(box?.y) ||
			!Number.isFinite(box?.w) ||
			!Number.isFinite(box?.h)
		) {
			continue
		}
		bounds[shapeId] = {
			minX: box.x,
			minY: box.y,
			maxX: box.x + box.w,
			maxY: box.y + box.h,
			// Only an editor can answer getText, so whatever it said is kept verbatim.
			...(typeof box.text === 'string' && box.text ? { text: box.text } : null),
		}
	}

	await putRenderResult(env, body.token, bounds)
	return Response.json({ error: false, stored: Object.keys(bounds).length })
}
