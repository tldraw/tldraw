import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'

export async function getPublishedRoomSnapshot(
	env: Environment,
	roomId: string
): Promise<RoomSnapshot | undefined> {
	const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(roomId)
	if (!parentSlug) throw Error('not found')

	const file = await createPostgresConnectionPool(env, 'getPublishedRoomSnapshot')
		.selectFrom('file')
		.selectAll()
		.where('id', '=', parentSlug)
		.executeTakeFirst()

	if (!file) throw Error('not found')

	if (!file.published) throw Error('not published')

	return (await env.ROOM_SNAPSHOTS.get(
		getR2KeyForRoom({ slug: `${parentSlug}/${roomId}`, isApp: true })
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
