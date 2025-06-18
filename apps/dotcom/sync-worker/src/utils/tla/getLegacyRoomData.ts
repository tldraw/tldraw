import { RoomOpenMode } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { getR2KeyForRoom, getR2KeyForSnapshot } from '../../r2'
import { R2Snapshot } from '../../routes/createRoomSnapshot'
import { Environment } from '../../types'
import { getRoomDurableObject } from '../durableObjects'
import { getSlug } from '../roomOpenMode'

export async function getLegacyRoomData(
	env: Environment,
	id: string,
	type: RoomOpenMode | 'snapshot'
) {
	if (type === 'snapshot') {
		const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(id)
		if (!parentSlug) return null

		const snapshot = await env.ROOM_SNAPSHOTS.get(
			getR2KeyForSnapshot({ parentSlug, snapshotSlug: id, isApp: false })
		)
		if (snapshot) {
			const result = ((await snapshot.json()) as R2Snapshot)?.drawing as RoomSnapshot
			if (result) return JSON.stringify(result)
		}
		return null
	}

	const slug = await getSlug(env, id, type)
	if (!slug) return null
	await getRoomDurableObject(env, id).awaitPersist()
	return await env.ROOMS.get(getR2KeyForRoom({ slug, isApp: false })).then((r) => r?.text())
}
