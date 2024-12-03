import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { assert, deleteFromLocalStorage, getFromLocalStorage, setInLocalStorage } from 'tldraw'
import { LocalEditor } from '../../components/LocalEditor'
import { globalEditor } from '../../utils/globalEditor'
import { SneakyDarkModeSync } from '../components/TlaEditor/SneakyDarkModeSync'
import { components } from '../components/TlaEditor/TlaEditor'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { SHOULD_SLURP_FILE } from '../utils/temporary-files'
import { getFilePath } from '../utils/urls'

export function Component() {
	const app = useMaybeApp()
	const navigate = useNavigate()
	const creatingFile = useRef(false)

	useEffect(() => {
		if (!app) return

		const shouldSlurpFile = getFromLocalStorage(SHOULD_SLURP_FILE)
		if (shouldSlurpFile) {
			deleteFromLocalStorage(SHOULD_SLURP_FILE)
			const res = app.slurpFile()
			if (res.ok) {
				navigate(getFilePath(res.value.file.id), { state: { mode: 'create' }, replace: true })
			}
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
	return (
		<TlaAnonLayout>
			<LocalEditor
				componentsOverride={components}
				onMount={(editor) => {
					globalEditor.set(editor)

					// the first time the user makes a change we should indicate
					// that the file should be slurped
					let unsub = editor.store.listen(
						() => {
							setInLocalStorage(SHOULD_SLURP_FILE, 'true')
							unsub()
							unsub = () => {}
						},
						{ scope: 'document', source: 'user' }
					)
					return () => {
						unsub()
					}
				}}
			>
				<SneakyDarkModeSync />
			</LocalEditor>
		</TlaAnonLayout>
	)
}
