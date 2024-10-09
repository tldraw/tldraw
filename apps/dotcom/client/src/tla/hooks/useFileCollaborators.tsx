import { TldrawAppFile } from '../utils/db-schema'

export function useFileCollaborators(_fileId: TldrawAppFile['id']) {
	// const app = useApp()
	// const collaborators = useValue(
	// 	'file collaborators',
	// 	() => {
	// 		const { auth } = app.getSessionState()
	// 		if (!auth) throw Error('no auth')
	// 		return app.getFileCollaborators(fileId).filter((c) => c !== auth.userId)
	// 	},
	// 	[app, fileId]
	// )

	return []
}
