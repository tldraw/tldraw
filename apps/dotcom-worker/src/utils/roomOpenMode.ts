import { ROOM_OPEN_MODE, RoomOpenMode } from '@tldraw/dotcom-shared'
import { exhaustiveSwitchError, lns } from '@tldraw/utils'
import { Environment } from '../types'

export async function getSlug(env: Environment, slug: string | null, roomOpenMode: RoomOpenMode) {
	if (!slug) return null
	switch (roomOpenMode) {
		case ROOM_OPEN_MODE.READ_WRITE:
			return slug
		case ROOM_OPEN_MODE.READ_ONLY:
			return await env.READONLY_SLUG_TO_SLUG.get(slug)
		case ROOM_OPEN_MODE.READ_ONLY_LEGACY:
			return lns(slug)
		default:
			exhaustiveSwitchError(roomOpenMode)
	}
}
