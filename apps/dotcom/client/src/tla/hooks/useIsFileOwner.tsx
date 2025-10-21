import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

export function useIsFileOwner(fileId: string, groupId: string): boolean {
	const app = useMaybeApp()
	return useValue(
		'isOwner',
		() => {
			if (!app) return false
			if (!fileId) return false
			const file = app?.getFile(fileId)
			if (!file) return false
			if (file.ownerId) return file.ownerId === app.userId
			if (file.owningGroupId) return file.owningGroupId === groupId
			return false
		},
		[app, fileId, groupId]
	)
}
