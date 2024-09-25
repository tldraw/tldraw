import { useValue } from 'tldraw'
import { TldrawAppFileId } from '../utils/schema/TldrawAppFile'
import { useApp } from './useAppState'

export function useFileCollaborators(fileId: TldrawAppFileId) {
	const app = useApp()
	const collaborators = useValue(
		'file collaborators',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) throw Error('no auth')
			return app.getFileCollaborators(auth.workspaceId, fileId).filter((c) => c !== auth.userId)
		},
		[app, fileId]
	)

	return collaborators
}
