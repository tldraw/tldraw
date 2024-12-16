import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

export function useIsFilePinned(fileId?: string): boolean {
	const app = useMaybeApp()
	return useValue(
		'isPinned',
		() => {
			if (!fileId) return false
			return app?.getFileState(fileId)?.isPinned || false
		},
		[app, fileId]
	)
}
