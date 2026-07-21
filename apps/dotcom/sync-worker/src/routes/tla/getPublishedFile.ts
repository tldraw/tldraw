import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'

export interface PublishedFileInfo {
	id: string
	published: boolean
	lastPublished: number
}

// Look up the file behind a published slug without loading the room snapshot itself. Returns null
// when the slug is unknown; callers decide how to treat unpublished files.
export async function getPublishedFileInfo(
	env: Environment,
	publishedSlug: string
): Promise<PublishedFileInfo | null> {
	const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(publishedSlug)
	if (!parentSlug) return null

	// createPostgresConnectionPool news up a pg.Pool; destroy it so idle pools don't pile up in the
	// isolate across MCP resolves, OG image requests, and queue re-resolves.
	const db = createPostgresConnectionPool(env, 'getPublishedFileInfo')
	try {
		const file = await db
			.selectFrom('file')
			.select(['id', 'published', 'lastPublished'])
			.where('id', '=', parentSlug)
			.executeTakeFirst()
		return file ?? null
	} finally {
		await db.destroy()
	}
}

export async function getPublishedRoomSnapshot(
	env: Environment,
	roomId: string
): Promise<RoomSnapshot | undefined> {
	// Re-resolve the published slug on every read so the published gate holds at serve time, not just
	// when the board was first resolved. A board un-published between resolution and this read must
	// stop resolving even though its R2 snapshot lingers until the replicator deletes it (the DB
	// `published` flag flips immediately; the R2 cleanup lags behind it).
	const file = await getPublishedFileInfo(env, roomId)
	if (!file) throw Error('not found')
	if (!file.published) throw Error('not published')

	return (await env.ROOM_SNAPSHOTS.get(
		getR2KeyForRoom({ slug: `${file.id}/${roomId}`, isApp: true })
	).then((r) => r?.json())) as RoomSnapshot | undefined
}

// Get a published file from a file's publishedSlug, if there is one.
export async function getPublishedFile(request: IRequest, env: Environment): Promise<Response> {
	const { roomId } = request.params
	if (!roomId) {
		return Response.json({ error: true, message: 'Room ID is required' }, { status: 400 })
	}

	const publishedRoomSnapshot = await getPublishedRoomSnapshot(env, roomId)
	if (!publishedRoomSnapshot)
		return Response.json({ error: true, message: 'Room not found' }, { status: 404 })

	const { documents, schema } = publishedRoomSnapshot

	return new Response(
		JSON.stringify({
			records: documents.map((d) => d.state),
			schema: schema,
			error: false,
		}),
		{
			headers: { 'content-type': 'application/json' },
		}
	)
}
