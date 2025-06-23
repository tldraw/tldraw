import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

export function useIsFileOwner(fileId?: string): boolean {
	const app = useMaybeApp()
	return useValue(
		'isOwner',
		() => {
			if (!fileId) return false
			if (!app) return false
			return app.getFile(fileId)?.ownerId === app.userId
		},
		[app, fileId]
	)
}

export function useCanUpdateFile(fileId?: string): boolean {
	const app = useMaybeApp()
	return useValue(
		'canUpdateFile',
		() => {
			if (!fileId) return false
			return app?.canUpdateFile(fileId) ?? false
		},
		[app, fileId]
	)
}
