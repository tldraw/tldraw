import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { assert, react, useDialogs } from 'tldraw'
import { LocalEditor } from '../../components/LocalEditor'
import { routes } from '../../routeDefs'
import { globalEditor } from '../../utils/globalEditor'
import { TlaInviteDialog } from '../components/dialogs/TlaInviteDialog'
import { SneakyDarkModeSync } from '../components/TlaEditor/sneaky/SneakyDarkModeSync'
import { components } from '../components/TlaEditor/TlaEditor'
import { useMaybeApp } from '../hooks/useAppState'
import { useInviteDetails } from '../hooks/useInviteDetails'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { clearShouldSlurpFile, getShouldSlurpFile, setShouldSlurpFile } from '../utils/slurping'

export function Component() {
	const app = useMaybeApp()
	const navigate = useNavigate()
	const location = useLocation()

	useEffect(() => {
		const handleFileOperations = async () => {
			if (!app) return

			if (getShouldSlurpFile()) {
				const res = await app.slurpFile()
				if (res.ok) {
					clearShouldSlurpFile()
					app.ensureFileVisibleInSidebar(res.value.file.id)
					navigate(routes.tlaFile(res.value.file.id), {
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

			const recentFiles = app.getUserRecentFiles()
			if (recentFiles.length === 0) {
				const result = await app.createFile()
				assert(result.ok, 'Failed to create file')
				// result is only false if the user reached their file limit so
				// we don't need to handle that case here since they have no files
				if (result.ok) {
					app.ensureFileVisibleInSidebar(result.value.file.id)
					navigate(routes.tlaFile(result.value.file.id), {
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
	const inviteInfo = useInviteDetails()
	const dialogs = useDialogs()

	useEffect(() => {
		if (inviteInfo && !inviteInfo.error) {
			dialogs.addDialog({
				component: ({ onClose }) => <TlaInviteDialog inviteInfo={inviteInfo} onClose={onClose} />,
			})
		}
	}, [inviteInfo, dialogs])

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
