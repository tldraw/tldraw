import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForSnapshots } from '../r2'
import { Environment } from '../types'

function createItem(i: R2Object) {
	return {
		id: i.key.split('/').pop(),
		uploaded: i.uploaded,
	}
}

export async function getRoomSnapshots(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return notFound()

	const prefix = getR2KeyForSnapshots({ parentSlug: roomId, isApp: true })

	let batch = await env.ROOM_SNAPSHOTS.list({
		prefix,
	})
	const result = [...batch.objects.map(createItem)]

	while (batch.truncated) {
		const next = await env.ROOM_SNAPSHOTS.list({
			cursor: batch.cursor,
		})
		result.push(...next.objects.map(createItem))

		batch = next
	}

	return new Response(JSON.stringify({ snapshots: result }), { status: 200 })
}
