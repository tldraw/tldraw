import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
	DefaultDebugMenu,
	DefaultDebugMenuContent,
	Editor,
	TLComponents,
	TLSessionStateSnapshot,
	TLUiDialogsContextType,
	Tldraw,
	TldrawUiMenuItem,
	createSessionStateSnapshotSignal,
	parseDeepLinkString,
	react,
	throttle,
	tltime,
	useAtom,
	useDialogs,
	useEditor,
	useEvent,
	useValue,
} from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useOpenUrlAndTrack } from '../../../hooks/useOpenUrlAndTrack'
import { useRoomLoadTracking } from '../../../hooks/useRoomLoadTracking'
import { useHandleUiEvents } from '../../../utils/analytics'
import { assetUrls } from '../../../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../../../utils/config'
import { createAssetFromUrl } from '../../../utils/createAssetFromUrl'
import { globalEditor } from '../../../utils/globalEditor'
import { multiplayerAssetStore } from '../../../utils/multiplayerAssetStore'
import { useMaybeApp } from '../../hooks/useAppState'
import { ReadyWrapper, useSetIsReady } from '../../hooks/useIsReady'
import { useNewRoomCreationTracking } from '../../hooks/useNewRoomCreationTracking'
import { useTldrawUser } from '../../hooks/useUser'
import { maybeSlurp } from '../../utils/slurping'
import { A11yAudit } from './TlaDebug'
import { TlaEditorWrapper } from './TlaEditorWrapper'
import { TlaEditorErrorFallback } from './editor-components/TlaEditorErrorFallback'
import { TlaEditorMenuPanel } from './editor-components/TlaEditorMenuPanel'
import { TlaEditorSharePanel } from './editor-components/TlaEditorSharePanel'
import { TlaEditorTopPanel } from './editor-components/TlaEditorTopPanel'
import { SneakyDarkModeSync } from './sneaky/SneakyDarkModeSync'
import { SneakyTldrawFileDropHandler } from './sneaky/SneakyFileDropHandler'
import { SneakyLargeFileHander } from './sneaky/SneakyLargeFileHandler'
import { SneakySetDocumentTitle } from './sneaky/SneakySetDocumentTitle'
import { SneakyToolSwitcher } from './sneaky/SneakyToolSwitcher'
import { useExtraDragIconOverrides } from './useExtraToolDragIcons'
import { useFileEditorOverrides } from './useFileEditorOverrides'

/** @internal */
export const components: TLComponents = {
	ErrorFallback: TlaEditorErrorFallback,
	MenuPanel: TlaEditorMenuPanel,
	TopPanel: TlaEditorTopPanel,
	SharePanel: TlaEditorSharePanel,
	Dialogs: null,
	Toasts: null,
	DebugMenu: () => {
		const app = useMaybeApp()
		const openAndTrack = useOpenUrlAndTrack('unknown')
		const editor = useEditor()
		const isReadOnly = useValue('isReadOnly', () => editor.getIsReadonly(), [editor])
		return (
			<DefaultDebugMenu>
				<A11yAudit />
				{!isReadOnly && app && (
					<TldrawUiMenuItem
						id="user-manual"
						label="File history"
						readonlyOk
						onSelect={() => {
							const url = new URL(window.location.href)
							url.pathname += '/history'
							openAndTrack(url.toString())
						}}
					/>
				)}
				<DefaultDebugMenuContent />
			</DefaultDebugMenu>
		)
	},
}

interface TlaEditorProps {
	fileSlug: string
	isEmbed?: boolean
	deepLinks?: boolean
}

export function TlaEditor(props: TlaEditorProps) {
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

function TlaEditorInner({ fileSlug, deepLinks }: TlaEditorProps) {
	const handleUiEvent = useHandleUiEvents()
	const app = useMaybeApp()

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
	const getShapeVisibility = useCallback(
		() => (hideAllShapes.get() ? 'hidden' : 'inherit'),
		[hideAllShapes]
	)
	const remountImageShapes = useCallback(() => {
		hideAllShapes.set(true)
		requestAnimationFrame(() => {
			hideAllShapes.set(false)
		})
	}, [hideAllShapes])

	const trackRoomLoaded = useRoomLoadTracking()
	const trackNewRoomCreation = useNewRoomCreationTracking()

	const handleMount = useCallback(
		(editor: Editor) => {
			trackRoomLoaded(editor)
			trackNewRoomCreation(app, fileId)
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
			const deepLink = new URLSearchParams(window.location.search).get('d')
			if (fileState?.lastSessionState && !deepLink) {
				editor.loadSnapshot(
					{ session: JSON.parse(fileState.lastSessionState.trim() || 'null') },
					{ forceOverwriteSessionState: true }
				)
			} else if (deepLink) {
				editor.navigateToDeepLink(parseDeepLinkString(deepLink))
			}
			const sessionState$ = createSessionStateSnapshotSignal(editor.store)
			const updateSessionState = throttle((state: TLSessionStateSnapshot) => {
				app.onFileSessionStateUpdate(fileId, state)
			}, 5000)
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

			return () => {
				updateSessionState.flush()
				abortController.abort()
				cleanup()
			}
		},
		[addDialog, trackRoomLoaded, trackNewRoomCreation, app, fileId, remountImageShapes, setIsReady]
	)

	const user = useTldrawUser()
	const getUserToken = useEvent(async () => {
		return (await user?.getToken()) ?? 'not-logged-in'
	})
	const hasUser = !!user
	const assets = useMemo(() => {
		return multiplayerAssetStore(() => fileId)
	}, [fileId])

	const store = useSync({
		uri: useCallback(async () => {
			const url = new URL(`${MULTIPLAYER_SERVER}/app/file/${fileSlug}`)
			if (hasUser) {
				url.searchParams.set('accessToken', await getUserToken())
			}
			return url.toString()
		}, [fileSlug, hasUser, getUserToken]),
		assets,
		userInfo: app?.tlUser.userPreferences,
	})

	// we need to prevent calling onFileExit if the store is in an error state
	const storeError = useRef(false)
	if (store.status === 'error') {
		storeError.current = true
	}

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
			if (didEnter && !storeError.current) {
				app.onFileExit(fileId)
			}
		}
	}, [app, fileId, store.status])

	const overrides = useFileEditorOverrides({ fileSlug })
	const extraDragIconOverrides = useExtraDragIconOverrides()

	return (
		<TlaEditorWrapper>
			<Tldraw
				className="tla-editor"
				licenseKey={getLicenseKey()}
				store={store}
				assetUrls={assetUrls}
				user={app?.tlUser}
				onMount={handleMount}
				onUiEvent={handleUiEvent}
				components={components}
				options={{ actionShortcutsLocation: 'toolbar' }}
				deepLinks={deepLinks || undefined}
				overrides={[overrides, extraDragIconOverrides]}
				getShapeVisibility={getShapeVisibility}
			>
				<ThemeUpdater />
				<SneakyDarkModeSync />
				<SneakyToolSwitcher />
				{app && <SneakyTldrawFileDropHandler />}
				<SneakyFileUpdateHandler fileId={fileId} />
				<SneakyLargeFileHander />
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
			// room know that an edit has been made.
			// It doesn't need to be super fast or accurate so we can throttle it a lot
			10_000
		)
		const unsub = editor.store.listen(onChange, { scope: 'document', source: 'user' })
		return () => {
			onChange.flush()
			unsub()
		}
	}, [app, fileId, editor])

	return null
}
