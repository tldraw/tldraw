import { TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { isRoomIdTooLong } from '../utils/roomIdIsTooLong'
import { getRoomCurrentSnapshot } from '../utils/tla/getRoomCurrentSnapshot'
import { getTldrawAppDurableObject } from '../utils/tla/getTldrawAppDurableObject'
import {
	fileOwnerStatusErrorResponse,
	getFileOwnerStatus,
	getUserIdFromRequest,
} from '../utils/tla/permissions'
import { updateRoomSnapshot } from '../utils/tla/updateRoomSnapshot'

export async function duplicateRoom(request: IRequest, env: Environment): Promise<Response> {
	const { roomId } = request.params

	const userId = await getUserIdFromRequest(request, env)
	if (!userId) {
		return Response.json({ error: true, message: 'No user' }, { status: 401 })
	}

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

	// Get the current serialized snapshot of the room (by waking up the worker,
	// if we have to). Why not grab from the database directly? Because the worker
	// only persists every ~30s while users are actively editing the room. If we
	// knew whether the room was active or not (either by checking whether the
	// worker was awake or somehow recording which rooms have active users in them,
	// or when the room was last edited) we could make a better decision.
	const serializedSnapshot = await getRoomCurrentSnapshot(roomId, env)

	// Create a new slug for the duplicated room
	const slug = uniqueId()

	// Bang the snapshot into the database under a different slug
	await updateRoomSnapshot(slug, serializedSnapshot, env)

	// Now create a new file in the app durable object
	const appDo = getTldrawAppDurableObject(env)
	const fileId = TldrawAppFileRecordType.createId(slug)
	await appDo.createNewFile(
		TldrawAppFileRecordType.create({
			id: fileId,
			ownerId: userId,
		})
	)

	// Send back the slug so that the client can redirect to the new room
	return new Response(JSON.stringify({ error: false, slug }))
}
