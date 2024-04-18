import { RoomOpenMode, exhaustiveSwitchError, lns } from '@tldraw/utils'
import { Environment } from '../types'

export async function getSlug(env: Environment, slug: string | null, roomOpenMode: RoomOpenMode) {
	if (!slug) return null
	switch (roomOpenMode) {
		case 'read-write':
			return slug
		case 'readonly':
			return await env.READONLY_SLUG_TO_SLUG.get(slug)
		case 'readonly-legacy':
			return lns(slug)
		default:
			exhaustiveSwitchError(roomOpenMode)
	}
}
