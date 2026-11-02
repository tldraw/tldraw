import { DB } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { Kysely } from 'kysely'
import { withPostgres } from '../../postgres'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'

export interface PublishedFileInfo {
	id: string
	published: boolean
	lastPublished: number
}

// Look up the file behind a published slug without loading the room snapshot itself. Returns null
// when the slug is unknown; callers decide how to treat unpublished files. The KV lookup runs
// before any pool exists, so an unknown slug — a crawler-reachable outcome — costs no connection.
//
// `db` is an invocation-scoped pool a caller may lend; withPostgres holds the ownership contract.
export async function getPublishedFileInfo(
	env: Environment,
	publishedSlug: string,
	db?: Kysely<DB>
): Promise<PublishedFileInfo | null> {
	const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(publishedSlug)
	if (!parentSlug) return null

	const file = await withPostgres(env, 'getPublishedFileInfo', db, (db) =>
		db
			.selectFrom('file')
			.select(['id', 'published', 'lastPublished'])
			.where('id', '=', parentSlug)
			.executeTakeFirst()
	)
	return file ?? null
}

export async function getPublishedRoomSnapshot(
	env: Environment,
	roomId: string,
	db?: Kysely<DB>
): Promise<RoomSnapshot | undefined> {
	// Re-resolve the published slug on every read so the published gate holds at serve time, not
	// just when the board was first resolved. A board un-published between resolution and this
	// read must stop resolving even though its R2 snapshot lingers until the outbox's unpublish
	// effect deletes it (the DB `published` flag flips immediately; R2 cleanup lags behind it).
	// Undefined (not a throw) so unknown/unpublished slugs surface as a 404, not a 500.
	//
	// `db` shares a connection, never the answer: the re-read is the serve-time gate and always
	// runs; a supplied pool only decides which connection it rides.
	const file = await getPublishedFileInfo(env, roomId, db)
	if (!file) return undefined
	if (!file.published) return undefined

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
