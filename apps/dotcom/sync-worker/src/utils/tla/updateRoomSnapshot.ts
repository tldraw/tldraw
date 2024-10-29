import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'

export function updateRoomSnapshot(slug: string, serializedSnapshot: string, env: Environment) {
	return env.ROOMS.put(getR2KeyForRoom({ slug, isApp: true }), serializedSnapshot)
}
