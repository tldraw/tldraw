import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'

export async function getRoomPersistedSnapshot(slug: string, env: Environment): Promise<string> {
	const roomKey = getR2KeyForRoom({ slug, isApp: true })
	const snapshot = await env.ROOMS.get(roomKey).then((res) => res?.text())
	if (!snapshot) {
		throw Error('Room not found')
	}
	return snapshot
}
