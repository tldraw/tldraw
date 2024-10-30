import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getFromLocalStorage, setInLocalStorage, uniqueId } from 'tldraw'
import { TlaEditor } from '../components/TlaEditor/TlaEditor'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { getLocalSessionState } from '../utils/local-session-state'
import { TEMPORARY_FILE_KEY } from '../utils/temporary-files'
import { getFilePath } from '../utils/urls'

export function Component() {
	const app = useMaybeApp()
	const [newFileId, setNewFileId] = useState<string | null>(null)

	useEffect(() => {
		if (!app) return
		if (app.getUserRecentFiles().length === 0) {
			app.createFile().then((res) => {
				if (res.ok) {
					const { file } = res.value
					setNewFileId(file.id)
				}
			})
		}
	}, [app])

	if (!app) return <LocalTldraw />
	// Navigate to the most recent file (if there is one) or else a new file
	const { auth } = getLocalSessionState()
	const fileId = auth?.userId && app.getUserRecentFiles()[0]?.fileId
	if (fileId) {
		return <Navigate to={getFilePath(fileId)} replace />
	}

	if (newFileId) {
		return <Navigate to={getFilePath(newFileId)} replace state={{ isCreateMode: true }} />
	}

	return null
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
