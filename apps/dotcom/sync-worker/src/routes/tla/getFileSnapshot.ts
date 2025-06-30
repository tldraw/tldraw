import { RoomSnapshot } from '@tldraw/sync-core'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'

export async function getFileSnapshot(
	env: Environment,
	fileSlug: string
): Promise<RoomSnapshot | null> {
	const snapshot = await env.ROOMS.get(getR2KeyForRoom({ slug: fileSlug, isApp: true }))
	if (!snapshot) {
		return null
	}

	return snapshot.json() as Promise<RoomSnapshot>
}
