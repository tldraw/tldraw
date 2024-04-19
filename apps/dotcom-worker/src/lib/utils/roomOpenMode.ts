import { RoomOpenMode } from '@tldraw/dotcom-shared'
import { exhaustiveSwitchError, lns } from '@tldraw/utils'
import { Environment } from '../types'

export async function getSlug(env: Environment, slug: string | null, roomOpenMode: RoomOpenMode) {
	if (!slug) return null
	switch (roomOpenMode) {
		case RoomOpenMode.READ_WRITE:
			return slug
		case RoomOpenMode.READ_ONLY:
			return await env.READONLY_SLUG_TO_SLUG.get(slug)
		case RoomOpenMode.READ_ONLY_LEGACY:
			return lns(slug)
		default:
			exhaustiveSwitchError(roomOpenMode)
	}
}
