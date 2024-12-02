import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getFromLocalStorage, setInLocalStorage, uniqueId } from 'tldraw'
import { LocalEditor } from '../../components/LocalEditor'
import { globalEditor } from '../../utils/globalEditor'
import { SCRATCH_PERSISTENCE_KEY } from '../../utils/scratch-persistence-key'
import { SneakyDarkModeSync } from '../components/TlaEditor/SneakyDarkModeSync'
import { TlaEditor, components } from '../components/TlaEditor/TlaEditor'
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
			creatingFile.current = true
			const result = app.createFile()
			if (result.ok) {
				navigate(getFilePath(result.value.file.id), { state: { mode: 'create' } })
			}
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

	const [showLegacyEditor, setShowLegacyEditor] = useState(null as boolean | null)

	useEffect(() => {
		hasMeaningfulLegacyContent().then(setShowLegacyEditor)
	}, [])

	if (showLegacyEditor === null) {
		return null
	}

	return (
		<TlaAnonLayout>
			{showLegacyEditor ? (
				<LocalEditor
					components={components}
					onMount={(editor) => {
						globalEditor.set(editor)
					}}
				>
					<SneakyDarkModeSync />
				</LocalEditor>
			) : (
				<TlaEditor
					mode={'create'}
					key={fileSlug}
					fileSlug={fileSlug}
					onDocumentChange={() => {
						// Save the file slug to local storage if they actually make changes
						setInLocalStorage(TEMPORARY_FILE_KEY, fileSlug)
					}}
				/>
			)}
		</TlaAnonLayout>
	)
}

// Need to do this check as fast as possible. This method takes about 30-60ms while using our
// indexedDb wrapper takes closer to 150ms to run.
async function hasMeaningfulLegacyContent() {
	try {
		const wasLegacyContentAlreadyMigrated = !!getFromLocalStorage(
			'tldraw_was_legacy_content_migrated'
		)
		if (wasLegacyContentAlreadyMigrated) return false

		return await new Promise<boolean>((resolve, reject) => {
			const request = indexedDB.open('TLDRAW_DOCUMENT_v2' + SCRATCH_PERSISTENCE_KEY)

			request.onerror = reject

			request.onsuccess = () => {
				const db = request.result
				const transaction = db.transaction(['records'], 'readonly')
				const objectStore = transaction.objectStore('records')
				const query = objectStore.count()

				query.onsuccess = () => {
					// one page record, one document record, one shape record = 3 records
					resolve(query.result >= 3)
				}

				query.onerror = reject
			}
		})
	} catch (_e) {
		return false
	}
}
