import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { assert, getFromSessionStorage, react } from 'tldraw'
import { LocalEditor } from '../../components/LocalEditor'
import { routes } from '../../routeDefs'
import { globalEditor } from '../../utils/globalEditor'
import { SneakyDarkModeSync } from '../components/TlaEditor/sneaky/SneakyDarkModeSync'
import { components } from '../components/TlaEditor/TlaEditor'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { clearRedirectOnSignIn } from '../utils/redirect'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'
import { clearShouldSlurpFile, getShouldSlurpFile, setShouldSlurpFile } from '../utils/slurping'

export function Component() {
	const app = useMaybeApp()
	const navigate = useNavigate()
	const location = useLocation()

	useEffect(() => {
		const handleFileOperations = async () => {
			if (!app) return

			// Check for redirect-to first (set by OAuth sign-in)
			const redirectTo = getFromSessionStorage(SESSION_STORAGE_KEYS.REDIRECT)
			if (redirectTo) {
				clearRedirectOnSignIn()
				navigate(redirectTo, { replace: true })
				return
			}

			if (getShouldSlurpFile()) {
				const res = await app.slurpFile()
				if (res.ok) {
					clearShouldSlurpFile()
					app.ensureFileVisibleInSidebar(res.value.fileId)
					navigate(routes.tlaFile(res.value.fileId), {
						replace: true,
						state: location.state,
					})
				} else {
					// if the user has too many files we end up here.
					// don't slurp the file and when they log out they'll
					// be able to see the same content that was there before
				}
				return
			}

			const recentFiles = app.getMyFiles()
			if (recentFiles.length === 0) {
				const result = await app.createFile()

				assert(result.ok, 'Failed to create file')
				// result is only false if the user reached their file limit so
				// we don't need to handle that case here since they have no files
				if (result.ok) {
					app.ensureFileVisibleInSidebar(result.value.fileId)
					navigate(routes.tlaFile(result.value.fileId), {
						replace: true,
						state: location.state,
					})
				}
				return
			}

			app.ensureFileVisibleInSidebar(recentFiles[0].fileId)
			navigate(routes.tlaFile(recentFiles[0].fileId), { replace: true, state: location.state })
		}

		handleFileOperations()
	}, [app, navigate, location])

	if (!app) return <LocalTldraw />

	// navigation will be handled by the useEffect above
	return null
}

function LocalTldraw() {
	return (
		<TlaAnonLayout>
			<LocalEditor
				data-testid="tla-editor"
				components={components}
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
				options={{ actionShortcutsLocation: 'toolbar' }}
			>
				<SneakyDarkModeSync />
			</LocalEditor>
		</TlaAnonLayout>
	)
}
