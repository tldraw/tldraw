import { ThumbnailSnapshotResponseBody } from '@tldraw/dotcom-shared'
import { TLRecord } from '@tldraw/tlschema'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { verifyThumbnailRenderToken } from '../../utils/renderTokens'
import { getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileRoomSnapshot } from './getSharedFile'

// Serves snapshot data to the thumbnail render page. Only accepts short-lived render tokens
// minted by this worker, so the render page cannot be pointed at arbitrary boards even though
// published snapshot data is itself public.
export async function getThumbnailSnapshot(request: IRequest, env: Environment): Promise<Response> {
	const token = new URL(request.url).searchParams.get('token')
	if (!token) {
		return json({ error: true, message: 'token is required' }, 400)
	}

	const job = await verifyThumbnailRenderToken(env, token)
	if (!job) {
		return json({ error: true, message: 'Invalid or expired render token' }, 403)
	}

	// Shared files re-check their share status here (not just when the token was minted), so that a
	// board un-shared during a token's 5 minute window stops resolving.
	const snapshot = await (
		job.kind === 'published'
			? getPublishedRoomSnapshot(env, job.slug)
			: getSharedFileRoomSnapshot(env, job.slug)
	).catch(() => undefined)
	if (!snapshot?.schema) {
		return json({ error: true, message: 'Board not found' }, 404)
	}

	return json({
		error: false,
		records: snapshot.documents.map((d) => d.state) as TLRecord[],
		schema: snapshot.schema,
		renderParams: {
			x: job.x,
			y: job.y,
			z: job.z,
			width: job.width,
			height: job.height,
			theme: job.theme,
		},
	})
}

function json(body: ThumbnailSnapshotResponseBody, status = 200) {
	return Response.json(body, { status })
}
