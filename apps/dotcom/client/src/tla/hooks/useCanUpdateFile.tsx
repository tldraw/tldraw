import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

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
