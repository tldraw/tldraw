import { useAuth } from '@clerk/clerk-react'
import { commentToolOverrides } from '@tldraw/commenting'
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { assert, getFromSessionStorage, omit, react } from 'tldraw'
import { LocalEditor } from '../../components/LocalEditor'
import { routes } from '../../routeDefs'
import { globalEditor } from '../../utils/globalEditor'
import { TlaAnonDotDevLink } from '../components/TlaAnonDotDevLink/TlaAnonDotDevLink'
import { useAnonCommentToolOverrides } from '../components/TlaEditor/CommentsOnCanvas'
import { SneakyDarkModeSync } from '../components/TlaEditor/sneaky/SneakyDarkModeSync'
import { SneakyDebugModeToast } from '../components/TlaEditor/sneaky/SneakyDebugModeToast'
import { components } from '../components/TlaEditor/TlaEditor'
import { VIA_LAST_FILE_CACHE } from '../components/TlaEditor/TlaFileSyncHost'
import { useIsAppLoading, useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { importFromUrl } from '../utils/importFromUrl'
import { getLastVisitedFileId } from '../utils/local-session-state'
import { clearRedirectOnSignIn } from '../utils/redirect'
import { resolveRootRedirect } from '../utils/rootRedirect'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'
import { clearShouldSlurpFile, getShouldSlurpFile, setShouldSlurpFile } from '../utils/slurping'

export function Component() {
	const app = useMaybeApp()
	const isAppLoading = useIsAppLoading()
	const { userId } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()

	// Signed in, Zero still preloading: go straight to the file this browser last synced to so its
	// socket opens in parallel with the preload. Anything that needs the app waits for the effect
	// below; a stale cached id is handled by the file page, which comes back here with it cleared.
	useEffect(() => {
		if (app || !isAppLoading || !userId) return
		const decision = resolveRootRedirect({
			redirectTo: getFromSessionStorage(SESSION_STORAGE_KEYS.REDIRECT),
			hasPendingImport: !!location.state?.importUrl,
			shouldSlurp: !!getShouldSlurpFile(),
			cachedFileId: getLastVisitedFileId(userId),
		})
		switch (decision.kind) {
			case 'redirect-to':
				clearRedirectOnSignIn()
				navigate(decision.to, { replace: true })
				return
			case 'cached-file':
				navigate(routes.tlaFile(decision.fileId), {
					replace: true,
					state: { ...location.state, [VIA_LAST_FILE_CACHE]: true },
				})
				return
			case 'wait-for-app':
				return
		}
	}, [app, isAppLoading, userId, navigate, location])

	useEffect(() => {
		const handleFileOperations = async () => {
			if (!app) return

			// Check for redirect-to first (set by OAuth sign-in)
			const redirectTo = getFromSessionStorage(SESSION_STORAGE_KEYS.REDIRECT)
			if (redirectTo) {
				clearRedirectOnSignIn()
				if (redirectTo.startsWith('/')) {
					navigate(redirectTo, { replace: true })
					return
				}
			}

			// Run pending import from URL (set by /import?url=... redirect)
			const pendingImportUrl = location.state?.importUrl
			if (pendingImportUrl) {
				// need to remove importUrl from location state so it doesn't persist after the import
				const state = omit(location.state, ['importUrl'])
				const result = await importFromUrl(app, pendingImportUrl)
				if (result.ok) {
					navigate(routes.tlaFile(result.fileId), { replace: true, state })
					return
				}
				// just update the state without navigating anywhere
				navigate('.', { replace: true, state })
				if (!result.toastAlreadyShown) {
					app.toasts?.addToast({
						severity: 'error',
						title: 'Import failed',
						description: result.error,
						keepOpen: true,
					})
				}
				return
			}

			if (getShouldSlurpFile()) {
				const res = await app.slurpFile()
				// Fails when the user has too many files; leaving the local content
				// unslurped means it's still there when they log out.
				if (res.ok) {
					clearShouldSlurpFile()
					navigate(routes.tlaFile(res.value.fileId), { replace: true, state: location.state })
					return
				}
			}

			// Land on the file the user last had open, across all workspaces, not just home.
			const mostRecentFileId = app.getMostRecentFileId()
			if (!mostRecentFileId) {
				const result = await app.createFile()

				assert(result.ok, 'Failed to create file')
				// result is only false if the user reached their file limit so
				// we don't need to handle that case here since they have no files
				navigate(routes.tlaFile(result.value.fileId), { replace: true, state: location.state })
				return
			}

			navigate(routes.tlaFile(mostRecentFileId), { replace: true, state: location.state })
		}

		handleFileOperations()
	}, [app, navigate, location])

	// A signed-in user must never see the scratch editor: it would start slurp detection on
	// whatever is in the local doc.
	if (!app) return isAppLoading ? null : <LocalTldraw />

	// navigation will be handled by the useEffect above
	return null
}

function LocalTldraw() {
	// No comments exist on the scratch board — the button is only a sign-in prompt, so the tool
	// itself stays unregistered and the anon override repoints its item at the sign-in dialog.
	const anonCommentToolOverrides = useAnonCommentToolOverrides()
	const commentToolItemOverrides = useMemo(
		() => [commentToolOverrides, anonCommentToolOverrides],
		[anonCommentToolOverrides]
	)

	return (
		<TlaAnonLayout>
			<LocalEditor
				data-testid="tla-editor"
				components={components}
				overrides={commentToolItemOverrides}
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
				<SneakyDebugModeToast />
				<TlaAnonDotDevLink />
			</LocalEditor>
		</TlaAnonLayout>
	)
}
