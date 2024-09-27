import { Navigate } from 'react-router-dom'
import { useApp } from '../hooks/useAppState'
import { useSessionState } from '../hooks/useSessionState'
import { getFileUrl } from '../utils/urls'

export function Component() {
	const app = useApp()
	const { auth, createdAt } = useSessionState()

	if (!auth) throw Error('This should be wrapped in a workspace auth check')

	// Navigate to the most recent file (if there is one) or else a new file
	const file =
		app.getUserRecentFiles(auth.userId, createdAt)?.[0]?.file ?? app.createFile(auth.userId)

	return <Navigate to={getFileUrl(file.id)} replace />
}
