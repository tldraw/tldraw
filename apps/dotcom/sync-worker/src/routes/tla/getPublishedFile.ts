import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { TLPostgresReplicator } from '../../TLPostgresReplicator'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'

// Get a published file from a file's publishedSlug, if there is one.
export async function getPublishedFile(request: IRequest, env: Environment): Promise<Response> {
	const { roomId } = request.params
	if (!roomId) {
		return Response.json({ error: true, message: 'Room ID is required' }, { status: 400 })
	}

	try {
		const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(roomId)
		if (!parentSlug) throw Error('not found')

		const replicator = env.TL_PG_REPLICATOR.get(
			env.TL_PG_REPLICATOR.idFromName('0')
		) as any as TLPostgresReplicator
		const file = await replicator.getFileRecord(parentSlug)

		if (!file) throw Error('not found')

		if (!file.published) throw Error('not published')

		const publishedRoomSnapshot = (await env.ROOM_SNAPSHOTS.get(
			getR2KeyForRoom({ slug: `${parentSlug}/${roomId}`, isApp: true })
		).then((r) => r?.json())) as RoomSnapshot | undefined

		if (!publishedRoomSnapshot) throw Error('not found')

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
	} catch (e: any) {
		return new Response(JSON.stringify({ error: true, message: e.message }), { status: 500 })
	}
}
