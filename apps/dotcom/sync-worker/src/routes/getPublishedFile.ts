import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { getTldrawAppDurableObject } from '../utils/tla/getTldrawAppDurableObject'

export async function getPublishedFile(request: IRequest, env: Environment): Promise<Response> {
	const { roomId } = request.params
	if (!roomId) {
		return Response.json({ error: true, message: 'Room ID is required' }, { status: 400 })
	}

	const app = getTldrawAppDurableObject(env)

	try {
		const publishedRoomSnapshot = await (app.getPublishedFile(roomId) as Promise<RoomSnapshot>)
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
