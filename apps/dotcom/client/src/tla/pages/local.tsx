import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getFromLocalStorage, setInLocalStorage, uniqueId } from 'tldraw'
import { TlaEditor } from '../components/TlaEditor/TlaEditor'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { TEMPORARY_FILE_KEY } from '../utils/temporary-files'
import { getFileUrl } from '../utils/urls'

export function Component() {
	const app = useMaybeApp()

	if (!app) return <LocalTldraw />
	// Navigate to the most recent file (if there is one) or else a new file
	const { createdAt } = app.getSessionState()
	const file = app.getUserRecentFiles(createdAt)?.[0]?.file
	if (file) {
		return <Navigate to={getFileUrl(file.id)} replace />
	}
	return <Navigate to={getFileUrl(app.createFile().id)} replace state={{ isCreateMode: true }} />
}

function LocalTldraw() {
	const [fileSlug] = useState(() => {
		return getFromLocalStorage(TEMPORARY_FILE_KEY) ?? uniqueId()
	})

	return (
		<TlaAnonLayout>
			<TlaEditor
				isCreateMode
				key={fileSlug}
				fileSlug={fileSlug}
				onDocumentChange={() => {
					// Save the file slug to local storage if they actually make changes
					setInLocalStorage(TEMPORARY_FILE_KEY, fileSlug)
				}}
			/>
		</TlaAnonLayout>
	)
}
