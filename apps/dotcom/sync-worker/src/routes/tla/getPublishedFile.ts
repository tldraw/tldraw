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
	roomId: string,
	// When the caller has already resolved the board (e.g. the thumbnail tool, which looks the file
	// up to build its cache key), it can pass the parent file id here to skip re-resolving the
	// published slug. That resolution spins up and tears down a Postgres pool, so reusing a known id
	// avoids a duplicate connection cycle per capture. Only pass an id for a board already known to
	// be published — the lookup is what enforces the published gate when no id is supplied.
	knownFileId?: string
): Promise<RoomSnapshot | undefined> {
	let fileId = knownFileId
	if (fileId === undefined) {
		const file = await getPublishedFileInfo(env, roomId)
		if (!file) throw Error('not found')
		if (!file.published) throw Error('not published')
		fileId = file.id
	}

	return (await env.ROOM_SNAPSHOTS.get(
		getR2KeyForRoom({ slug: `${fileId}/${roomId}`, isApp: true })
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
