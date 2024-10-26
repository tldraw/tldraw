import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../r2'
import { DBLoadResult, Environment } from '../types'
import { fileOwnerStatusErrorResponse, getFileOwnerStatus } from '../utils/permissions'
import { isRoomIdTooLong } from '../utils/roomIdIsTooLong'

export async function duplicateRoom(request: IRequest, env: Environment): Promise<Response> {
	const { roomId } = request.params

	const status = await getFileOwnerStatus(request, env, roomId)
	if (!status.ok) {
		return fileOwnerStatusErrorResponse(status.error)
	}

	if (!roomId) {
		return Response.json({ error: true, message: 'Room ID is required' }, { status: 400 })
	}

	if (isRoomIdTooLong(roomId)) {
		return Response.json({ error: true, message: 'Room ID is too long' }, { status: 400 })
	}

	// // Set up the durable object for this room
	const id = env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${roomId}`)
	const worker = env.TLDR_DOC.get(id)
	const docRes = (await worker.loadFromDatabase(roomId)) as DBLoadResult

	if (docRes.type !== 'room_found') {
		return Response.json({ error: true, message: 'Room not found' }, { status: 404 })
	}

	const snapshot = docRes.snapshot

	// Create a new slug for the duplicated room
	const slug = uniqueId()

	// Bang that snapshot into the database
	await env.ROOMS.put(getR2KeyForRoom({ slug, isApp: true }), JSON.stringify(snapshot))

	// Send back the slug so that the client can redirect to the new room
	// return new Response(JSON.stringify({ error: true, slug }))

	return new Response(JSON.stringify({ error: false, slug }))
}
