import { TldrawAppFileId } from '@tldraw/dotcom-shared'
import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

export function useIsFileOwner(fileId: TldrawAppFileId): boolean {
	const app = useMaybeApp()
	return useValue(
		'isOwner',
		() => {
			return app?.isFileOwner(fileId) ?? false
		},
		[app, fileId]
	)
}
