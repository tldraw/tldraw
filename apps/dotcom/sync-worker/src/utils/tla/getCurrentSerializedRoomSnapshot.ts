import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { Environment } from '../../types'

export async function getCurrentSerializedRoomSnapshot(
	roomId: string,
	env: Environment
): Promise<string> {
	const id = env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${roomId}`)
	const worker = env.TLDR_DOC.get(id)
	const snapshot = await worker.getCurrentSerializedSnapshot()
	if (!snapshot) {
		throw Error('Room not found')
	}
	return snapshot
}
