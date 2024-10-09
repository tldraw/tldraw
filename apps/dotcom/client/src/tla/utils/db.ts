import { init } from '@instantdb/react'
import { TldrawAppSchema } from './db-schema'

export const db = init<TldrawAppSchema>({ appId: 'e5b64469-d365-40f0-9b8a-a453ec43d50d' })

export function getNewFile(userId: string) {
	return {
		createdAt: Date.now(),
		updatedAt: Date.now(),
		name: 'New file',
		owner: userId,
		thumbnail: '',
		shared: true,
		sharedLinkType: 'edit',
		isEmpty: false,
	}
}
