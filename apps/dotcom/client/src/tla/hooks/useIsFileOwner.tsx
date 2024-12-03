import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

export function useIsFileOwner(fileId?: string): boolean {
	const app = useMaybeApp()
	return useValue(
		'isOwner',
		() => {
			if (!fileId) return false
			const ownerId = app?.getFile(fileId)?.ownerId
			return ownerId ? ownerId === app.userId : false
		},
		[app, fileId]
	)
}
