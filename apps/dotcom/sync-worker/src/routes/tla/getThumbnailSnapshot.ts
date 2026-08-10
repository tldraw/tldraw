import { ThumbnailSnapshotResponseBody } from '@tldraw/dotcom-shared'
import { TLRecord } from '@tldraw/tlschema'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import {
	isMintedRenderToken,
	renderJobAccess,
	verifyThumbnailRenderToken,
} from '../../utils/renderTokens'
import { getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileRoomSnapshot } from './getSharedFile'
import { reportThumbnailError } from './thumbnailShared'

// Serves snapshot data to the thumbnail render page. Only accepts short-lived render tokens
// minted by this worker, so the render page cannot be pointed at arbitrary boards even though
// published snapshot data is itself public.
export async function getThumbnailSnapshot(
	request: IRequest,
	env: Environment,
	ctx?: ExecutionContext
): Promise<Response> {
	const token = new URL(request.url).searchParams.get('token')
	if (!token) {
		return json({ error: true, message: 'token is required' }, 400)
	}

	const job = await verifyThumbnailRenderToken(env, token)
	if (!job) {
		return json({ error: true, message: 'Invalid or expired render token' }, 403)
	}

	// A valid signature only proves the holder of the secret made this, and a `render` token reads a
	// private board's full document. So one must also be recorded as ours (see isMintedRenderToken).
	// Answers the same 403 as a bad signature: which check failed is not the caller's business.
	if (!(await isMintedRenderToken(env, job, token))) {
		return json({ error: true, message: 'Invalid or expired render token' }, 403)
	}

	// Read under the gate the job was signed with, not a fixed one, so an MCP token stays confined to
	// what the MCP tool could resolve — including a board that has gone private since it was minted.
	// Shared files re-check here rather than trusting the mint, so a board deleted inside the token's
	// window (THUMBNAIL_RENDER_TOKEN_TTL_MS) stops resolving either way.
	const snapshot = await (
		job.kind === 'published'
			? getPublishedRoomSnapshot(env, job.slug)
			: getSharedFileRoomSnapshot(env, job.slug, { access: renderJobAccess(job) })
	).catch((error) => {
		// A load failure and a genuinely missing board both answer 404 here, which the render page
		// turns into an error state and the capture surfaces as a generic render failure. Report the
		// real cause so a broken snapshot read doesn't hide behind that.
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'thumbnail_snapshot',
			extras: { kind: job.kind },
		})
		return undefined
	})
	// A corrupt or partial R2 payload can carry schema metadata without a documents array; guard it
	// so it returns a controlled 404 rather than throwing on the .map below and 500ing the render.
	if (!snapshot?.schema || !snapshot.documents) {
		return json({ error: true, message: 'Board not found' }, 404)
	}

	// The token can target a specific page (the MCP tool labels its result with that page's name,
	// resolved when the token was minted). Shared files reload a live snapshot that may have changed
	// since then, so confirm the page still exists: if it was deleted meanwhile, the render page would
	// silently fall back to whichever page the snapshot opens to and the tool would return a PNG
	// mislabeled with the original page's name. Fail instead, so the capture surfaces as a retryable
	// render error rather than a wrong image.
	if (
		job.pageId &&
		!snapshot.documents.some((d) => (d.state as TLRecord | undefined)?.id === job.pageId)
	) {
		return json({ error: true, message: 'Page not found' }, 404)
	}

	// Same reasoning as the page check above, and it matters more here: with every requested shape
	// gone the render page would have nothing to fit the camera to and would export a blank frame,
	// which the tool would return as if it were a picture of those shapes. Requiring every id to
	// still be present turns a stale request into a retryable render error instead.
	if (job.shapeIds) {
		const presentIds = new Set(snapshot.documents.map((d) => (d.state as TLRecord | undefined)?.id))
		if (!job.shapeIds.every((id) => presentIds.has(id as TLRecord['id']))) {
			return json({ error: true, message: 'Shape not found' }, 404)
		}
	}

	return json({
		error: false,
		records: snapshot.documents.map((d) => d.state) as TLRecord[],
		schema: snapshot.schema,
		renderParams: {
			...(job.camera ? { camera: job.camera } : null),
			...(job.pageId ? { pageId: job.pageId } : null),
			...(job.shapeIds ? { shapeIds: job.shapeIds } : null),
			...(job.mode ? { mode: job.mode } : null),
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
