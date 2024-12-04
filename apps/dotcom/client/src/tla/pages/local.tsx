import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { assert, throttle } from 'tldraw'
import { LocalEditor } from '../../components/LocalEditor'
import { globalEditor } from '../../utils/globalEditor'
import { SneakyDarkModeSync } from '../components/TlaEditor/SneakyDarkModeSync'
import { components } from '../components/TlaEditor/TlaEditor'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import {
	clearShouldSlurpFile,
	getShouldSlurpFile,
	setShouldSlurpFile,
} from '../utils/temporary-files'
import { getFilePath } from '../utils/urls'

export function Component() {
	const app = useMaybeApp()
	const navigate = useNavigate()

	useEffect(() => {
		if (!app) return

		if (getShouldSlurpFile()) {
			clearShouldSlurpFile()
			const res = app.slurpFile()
			if (res.ok) {
				navigate(getFilePath(res.value.file.id), { state: { mode: 'create' }, replace: true })
			}
			return
		}

		const recentFiles = app.getUserRecentFiles()
		if (recentFiles.length === 0) {
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
					const shapes$ = editor.store.query.ids('shape')

					function maybeSlurpFile() {
						if (shapes$.get().size > 0) {
							setShouldSlurpFile()
						} else {
							clearShouldSlurpFile()
						}
					}

					maybeSlurpFile()
					const throttledMaybeSlurpFile = throttle(maybeSlurpFile, 1000)

					// the first time the user makes a change we should indicate
					// that the file should be slurped
					const unsub = editor.store.listen(maybeSlurpFile, { scope: 'document', source: 'user' })
					return () => {
						throttledMaybeSlurpFile.cancel()
						unsub()
					}
				}}
			>
				<SneakyDarkModeSync />
			</LocalEditor>
		</TlaAnonLayout>
	)
}
