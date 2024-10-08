import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForSnapshots } from '../r2'
import { Environment } from '../types'

export async function getRoomSnapshots(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return notFound()

	const prefix = getR2KeyForSnapshots({ parentSlug: roomId, isApp: true })

	let batch = await env.ROOM_SNAPSHOTS.list({
		prefix,
	})
	const result = [...batch.objects.map((o) => o.key.split('/').pop())]

	while (batch.truncated) {
		const next = await env.ROOM_SNAPSHOTS.list({
			cursor: batch.cursor,
		})
		result.push(...next.objects.map((o) => o.key.split('/').pop()))

		batch = next
	}

	return new Response(JSON.stringify({ snapshots: result }), { status: 200 })
}
