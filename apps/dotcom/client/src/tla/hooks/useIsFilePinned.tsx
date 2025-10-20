import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

export function useIsFilePinned(fileId: string, groupId: string): boolean {
	const app = useMaybeApp()
	return useValue(
		'isPinned',
		() => {
			if (!fileId) return false
			if (!app) return false
			return app.isPinned(fileId, groupId)
		},
		[app, fileId, groupId]
	)
}
