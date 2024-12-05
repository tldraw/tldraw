import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { assert, react } from 'tldraw'
import { LocalEditor } from '../../components/LocalEditor'
import { globalEditor } from '../../utils/globalEditor'
import { SneakyDarkModeSync } from '../components/TlaEditor/SneakyDarkModeSync'
import { components } from '../components/TlaEditor/TlaEditor'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { clearShouldSlurpFile, getShouldSlurpFile, setShouldSlurpFile } from '../utils/slurping'
import { getFilePath } from '../utils/urls'

export function Component() {
	const app = useMaybeApp()
	const navigate = useNavigate()

	useEffect(() => {
		if (!app) return

		if (getShouldSlurpFile()) {
			const res = app.slurpFile()
			if (res.ok) {
				clearShouldSlurpFile()
				navigate(getFilePath(res.value.file.id), { state: { mode: 'create' }, replace: true })
			} else {
				// if the user has too many files we end up here.
				// don't slurp the file and when they log out they'll
				// be able to see the same content that was there before
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

					return react('updateShouldSlurpFile', () => {
						if (shapes$.get().size > 0) {
							setShouldSlurpFile()
						} else {
							clearShouldSlurpFile()
						}
					})
				}}
			>
				<SneakyDarkModeSync />
			</LocalEditor>
		</TlaAnonLayout>
	)
}
