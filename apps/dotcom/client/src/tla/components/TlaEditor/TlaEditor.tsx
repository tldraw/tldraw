import { TlaFileOpenState } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { useCallback, useEffect } from 'react'
import {
	Editor,
	TLComponents,
	TLSessionStateSnapshot,
	TLUiDialogsContextType,
	Tldraw,
	assert,
	createSessionStateSnapshotSignal,
	react,
	throttle,
	tltime,
	useAtom,
	useDialogs,
	useEditor,
	useEvent,
} from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { assetUrls } from '../../../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../../../utils/config'
import { createAssetFromUrl } from '../../../utils/createAssetFromUrl'
import { globalEditor } from '../../../utils/globalEditor'
import { multiplayerAssetStore } from '../../../utils/multiplayerAssetStore'
import { useHandleUiEvents } from '../../../utils/useHandleUiEvent'
import { useMaybeApp } from '../../hooks/useAppState'
import { ReadyWrapper, useSetIsReady } from '../../hooks/useIsReady'
import { useTldrawUser } from '../../hooks/useUser'
import { maybeSlurp } from '../../utils/slurping'
import { SneakyDarkModeSync } from './SneakyDarkModeSync'
import { TlaEditorWrapper } from './TlaEditorWrapper'
import { TlaEditorErrorFallback } from './editor-components/TlaEditorErrorFallback'
import { TlaEditorKeyboardShortcutsDialog } from './editor-components/TlaEditorKeyboardShortcutsDialog'
import { TlaEditorMenuPanel } from './editor-components/TlaEditorMenuPanel'
import { TlaEditorSharePanel } from './editor-components/TlaEditorSharePanel'
import { TlaEditorTopPanel } from './editor-components/TlaEditorTopPanel'
import { SneakyTldrawFileDropHandler } from './sneaky/SneakyFileDropHandler'
import { SneakySetDocumentTitle } from './sneaky/SneakySetDocumentTitle'
import { useFileEditorOverrides } from './useFileEditorOverrides'

/** @internal */
export const components: TLComponents = {
	ErrorFallback: TlaEditorErrorFallback,
	KeyboardShortcutsDialog: TlaEditorKeyboardShortcutsDialog,
	MenuPanel: TlaEditorMenuPanel,
	TopPanel: TlaEditorTopPanel,
	SharePanel: TlaEditorSharePanel,
}

interface TlaEditorProps {
	fileSlug: string
	fileOpenState?: TlaFileOpenState
	deepLinks?: boolean
}

export function TlaEditor(props: TlaEditorProps) {
	if (props.fileOpenState?.mode === 'duplicate') {
		assert(props.fileOpenState.duplicateId, 'duplicateId is required when mode is duplicate')
	}
	// force re-mount when the file slug changes to prevent state from leaking between files
	return (
		<>
			<SneakySetDocumentTitle />
			<ReadyWrapper key={props.fileSlug}>
				<TlaEditorInner {...props} key={props.fileSlug} />
			</ReadyWrapper>
		</>
	)
}

function TlaEditorInner({ fileSlug, fileOpenState, deepLinks }: TlaEditorProps) {
	const handleUiEvent = useHandleUiEvents()
	const app = useMaybeApp()
	const mode = fileOpenState?.mode

	const fileId = fileSlug

	const setIsReady = useSetIsReady()

	const dialogs = useDialogs()
	// need to wrap this in a useEvent to prevent the context id from changing on us
	const addDialog: TLUiDialogsContextType['addDialog'] = useEvent((dialog) =>
		dialogs.addDialog(dialog)
	)

	// We cycle this flag to cause shapes to remount when slurping images/videos fails.
	// Because in that case we want to show the failure state for the images/videos.
	// i.e. where it appears that they are not present. so the user knows which ones failed.
	// There's probably a better way of doing this but I couldn't think of one.
	const hideAllShapes = useAtom('hideAllShapes', false)
	const isShapeHidden = useCallback(() => hideAllShapes.get(), [hideAllShapes])
	const remountImageShapes = useCallback(() => {
		hideAllShapes.set(true)
		requestAnimationFrame(() => {
			hideAllShapes.set(false)
		})
	}, [hideAllShapes])

	const handleMount = useCallback(
		(editor: Editor) => {
			;(window as any).app = app
			;(window as any).editor = editor
			// Register the editor globally
			globalEditor.set(editor)

			// Register the external asset handler
			editor.registerExternalAssetHandler('url', createAssetFromUrl)

			if (!app) {
				setIsReady()
				return
			}

			const fileState = app.getFileState(fileId)
			if (fileState?.lastSessionState) {
				editor.loadSnapshot({ session: JSON.parse(fileState.lastSessionState.trim() || 'null') })
			}
			const sessionState$ = createSessionStateSnapshotSignal(editor.store)
			const updateSessionState = throttle((state: TLSessionStateSnapshot) => {
				app.onFileSessionStateUpdate(fileId, state)
			}, 1000)
			// don't want to update if they only open the file and didn't look around
			let firstTime = true
			const cleanup = react('update session state', () => {
				const state = sessionState$.get()
				if (!state) return
				if (firstTime) {
					firstTime = false
					return
				}
				updateSessionState(state)
			})

			const abortController = new AbortController()
			maybeSlurp({
				app,
				editor,
				fileId,
				abortSignal: abortController.signal,
				addDialog,
				remountImageShapes,
			}).then(setIsReady)

			if (mode === 'slurp-legacy-file') {
				assert(fileOpenState?.snapshot, 'snapshot is required when mode is slurp-legacy-file')
				editor.loadSnapshot(fileOpenState.snapshot)
			}

			return () => {
				abortController.abort()
				cleanup()
				updateSessionState.cancel()
			}
		},
		[addDialog, app, fileId, fileOpenState, mode, remountImageShapes, setIsReady]
	)

	const user = useTldrawUser()

	const store = useSync({
		uri: useCallback(async () => {
			const url = new URL(`${MULTIPLAYER_SERVER}/app/file/${fileSlug}`)
			if (user) {
				url.searchParams.set('accessToken', await user.getToken())
			}
			if (mode) {
				url.searchParams.set('mode', mode)
				if (mode === 'duplicate') {
					const duplicateId = fileOpenState.duplicateId
					assert(duplicateId, 'duplicateId is required when mode is duplicate')
					url.searchParams.set('duplicateId', duplicateId)
				}
			}
			return url.toString()
		}, [fileSlug, user, mode, fileOpenState]),
		assets: multiplayerAssetStore,
		userInfo: app?.tlUser.userPreferences,
	})

	// Handle entering and exiting the file, with some protection against rapid enters/exits
	useEffect(() => {
		if (!app) return
		if (store.status !== 'synced-remote') return
		let didEnter = false
		let timer: any

		const fileState = app.getFileState(fileId)

		if (fileState && fileState.firstVisitAt) {
			// If there's a file state already then wait a second before marking it as entered
			timer = tltime.setTimeout(
				'file enter timer',
				() => {
					app.onFileEnter(fileId)
					didEnter = true
				},
				1000
			)
		} else {
			// If there's not a file state yet (i.e. if we're visiting this for the first time) then do an enter
			app.onFileEnter(fileId)
			didEnter = true
		}

		return () => {
			clearTimeout(timer)
			if (didEnter) {
				app.onFileExit(fileId)
			}
		}
	}, [app, fileId, store.status])

	const overrides = useFileEditorOverrides({ fileSlug })

	return (
		<TlaEditorWrapper>
			<Tldraw
				className="tla-editor"
				store={store}
				assetUrls={assetUrls}
				user={app?.tlUser}
				onMount={handleMount}
				onUiEvent={handleUiEvent}
				components={components}
				options={{ actionShortcutsLocation: 'toolbar' }}
				deepLinks={deepLinks || undefined}
				overrides={overrides}
				isShapeHidden={isShapeHidden}
			>
				<ThemeUpdater />
				<SneakyDarkModeSync />
				{app && <SneakyTldrawFileDropHandler />}
				<SneakyFileUpdateHandler fileId={fileId} />
			</Tldraw>
		</TlaEditorWrapper>
	)
}

function SneakyFileUpdateHandler({ fileId }: { fileId: string }) {
	const app = useMaybeApp()
	const editor = useEditor()
	useEffect(() => {
		const onChange = throttle(
			() => {
				if (!app) return
				app.onFileEdit(fileId)
			},
			// This is used to update the lastEditAt time in the database, and to let the local
			// room know that an edit ahs been made.
			// It doesn't need to be super fast or accurate so we can throttle it a lot
			5000
		)
		const unsub = editor.store.listen(onChange, { scope: 'document', source: 'user' })
		return () => {
			unsub()
			onChange.cancel()
		}
	}, [app, fileId, editor])

	return null
}
