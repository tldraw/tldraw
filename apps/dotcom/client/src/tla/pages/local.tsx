import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	assert,
	deleteFromLocalStorage,
	getFromLocalStorage,
	setInLocalStorage,
	uniqueId,
} from 'tldraw'
import { LocalEditor } from '../../components/LocalEditor'
import { globalEditor } from '../../utils/globalEditor'
import { SneakyDarkModeSync } from '../components/TlaEditor/SneakyDarkModeSync'
import { TlaEditor, components } from '../components/TlaEditor/TlaEditor'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import {
	LOCAL_LEGACY_SLUG,
	TEMPORARY_FILE_KEY,
	TLA_WAS_LEGACY_CONTENT_MIGRATED,
	hasMeaningfulLegacyContent,
} from '../utils/temporary-files'
import { getFilePath } from '../utils/urls'

export function Component() {
	const app = useMaybeApp()
	const navigate = useNavigate()
	const creatingFile = useRef(false)

	useEffect(() => {
		if (!app) return

		const claimTemporaryFileId = getFromLocalStorage(TEMPORARY_FILE_KEY)
		if (claimTemporaryFileId) {
			deleteFromLocalStorage(TEMPORARY_FILE_KEY)
			const slug = app.claimTemporaryFile(claimTemporaryFileId)
			navigate(getFilePath(slug), { state: { mode: 'create' }, replace: true })
			return
		}

		const recentFiles = app.getUserRecentFiles()
		if (recentFiles.length === 0) {
			creatingFile.current = true
			const result = app.createFile()
			assert(result.ok, 'Failed to create file')
			// result is only false if the user reached their file limit so
			// we don't need to handle that case here since they have no files
			if (result.ok) {
				navigate(getFilePath(result.value.file.id), { state: { mode: 'create' }, replace: true })
			}
			return
		}

		navigate(getFilePath(recentFiles[0].fileId), { replace: true })
	}, [app, navigate])

	if (!app) return <LocalTldraw />

	// navigation will be handled by the useEffect above
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
						setInLocalStorage(TEMPORARY_FILE_KEY, LOCAL_LEGACY_SLUG)
						setInLocalStorage(TLA_WAS_LEGACY_CONTENT_MIGRATED, 'false')
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
