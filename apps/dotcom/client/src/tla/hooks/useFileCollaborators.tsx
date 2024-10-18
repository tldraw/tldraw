import { TldrawAppFileId } from '@tldraw/dotcom-shared'
import { useValue } from 'tldraw'
import { getLocalSessionState } from '../utils/local-session-state'
import { useApp } from './useAppState'

export function useFileCollaborators(fileId: TldrawAppFileId) {
	const app = useApp()
	const collaborators = useValue(
		'file collaborators',
		() => {
			const { auth } = getLocalSessionState()
			if (!auth) throw Error('no auth')
			return app.getFileCollaborators(fileId).filter((c) => c !== auth.userId)
		},
		[app, fileId]
	)

	return collaborators
}
