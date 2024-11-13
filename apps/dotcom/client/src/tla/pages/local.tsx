import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getFromLocalStorage, setInLocalStorage, uniqueId } from 'tldraw'
import { TlaEditor } from '../components/TlaEditor/TlaEditor'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { getLocalSessionState } from '../utils/local-session-state'
import { TEMPORARY_FILE_KEY } from '../utils/temporary-files'
import { getFilePath } from '../utils/urls'

export function Component() {
	const app = useMaybeApp()
	const navigate = useNavigate()
	const creatingFile = useRef(false)

	useEffect(() => {
		if (!app) return
		if (app.getUserRecentFiles().length === 0) {
			app.createFile().then((res) => {
				if (res.ok) {
					creatingFile.current = true
					navigate(getFilePath(res.value.file.id), { state: { mode: 'create' } })
				}
			})
		}
	}, [app, navigate])

	if (!app) return <LocalTldraw />
	if (creatingFile.current) return null
	// Navigate to the most recent file (if there is one) or else a new file
	const { auth } = getLocalSessionState()
	const fileId = auth?.userId && app.getUserRecentFiles()[0]?.fileId
	if (fileId) {
		return <Navigate to={getFilePath(fileId)} replace />
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
				mode={'create'}
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
