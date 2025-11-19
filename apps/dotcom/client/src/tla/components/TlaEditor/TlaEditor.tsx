import { TLCustomServerEvent, getLicenseKey } from '@tldraw/dotcom-shared'
import { FairyEntity } from '@tldraw/fairy-shared'
import { useSync } from '@tldraw/sync'
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	DefaultDebugMenu,
	DefaultDebugMenuContent,
	Editor,
	TLComponents,
	TLPresenceStateInfo,
	TLSessionStateSnapshot,
	TLUiDialogsContextType,
	Tldraw,
	TldrawUiMenuItem,
	createDebugValue,
	createSessionStateSnapshotSignal,
	getDefaultUserPresence,
	parseDeepLinkString,
	react,
	throttle,
	tltime,
	useAtom,
	useDialogs,
	useEditor,
	useEvent,
	useValue,
	type TLPresenceUserInfo,
	type TLStore,
} from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useOpenUrlAndTrack } from '../../../hooks/useOpenUrlAndTrack'
import { useRoomLoadTracking } from '../../../hooks/useRoomLoadTracking'
import { trackEvent, useHandleUiEvents } from '../../../utils/analytics'
import { assetUrls } from '../../../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../../../utils/config'
import { createAssetFromUrl } from '../../../utils/createAssetFromUrl'
import { isDevelopmentEnv, isProductionEnv } from '../../../utils/env'
import { globalEditor } from '../../../utils/globalEditor'
import { multiplayerAssetStore } from '../../../utils/multiplayerAssetStore'
import { TldrawApp } from '../../app/TldrawApp'
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

// Lazy load fairy components
export const MAX_FAIRY_COUNT = 10
const FairyApp = lazy(() =>
	import('../../../fairy/FairyApp').then((m) => ({
		default: m.FairyApp,
	}))
)
const FairyHUD = lazy(() =>
	import('../../../fairy/FairyHUD').then((m) => ({ default: m.FairyHUD }))
)
const FairyVision = lazy(() =>
	import('../../../fairy/FairyVision').then((m) => ({ default: m.FairyVision }))
)
const Fairies = lazy(() => import('../../../fairy/Fairies').then((m) => ({ default: m.Fairies })))
const RemoteFairies = lazy(() =>
	import('../../../fairy/RemoteFairies').then((m) => ({ default: m.RemoteFairies }))
)
const InCanvasTaskList = lazy(() =>
	import('../../../fairy/InCanvasTaskList').then((m) => ({ default: m.InCanvasTaskList }))
)

const customFeatureFlags = {
	fairies: createDebugValue('fairies', {
		defaults: { all: false },
	}),
}

/** @internal */
export const components: TLComponents = {
	ErrorFallback: TlaEditorErrorFallback,
	MenuPanel: TlaEditorMenuPanel,
	TopPanel: TlaEditorTopPanel,
	SharePanel: TlaEditorSharePanel,
	Dialogs: null,
	Toasts: null,
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
			const fileStateUpdater = new FileStateUpdater(app, fileId, editor)

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
				fileStateUpdater.dispose()
				abortController.abort()
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

	// Ref to store agents for presence syncing
	// TODO(mime): use TldrawFairyAgent[] type when ready
	const agentsRef = useRef<any[]>([])

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
		onCustomMessageReceived: useCallback((message: TLCustomServerEvent) => {
			trackEvent(message.type)
		}, []),
		getUserPresence: useCallback(
			(store: TLStore, userInfo: TLPresenceUserInfo): TLPresenceStateInfo | null => {
				const defaultPresence = getDefaultUserPresence(store, userInfo)
				if (!defaultPresence) return null

				// Add fairy positions to presence for all active agents
				const fairyPresences =
					agentsRef.current
						?.map((agent) => {
							const entity = agent?.$fairyEntity?.get?.() as FairyEntity | undefined
							const outfit = agent?.$fairyConfig?.get?.()?.outfit as string | undefined
							if (!entity || !outfit) return null
							return { entity, outfit }
						})
						.filter((agent): agent is NonNullable<typeof agent> => agent !== null) ?? []

				defaultPresence.meta = { ...defaultPresence.meta, fairies: fairyPresences }
				return defaultPresence
			},
			[]
		),
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
		let timer: number

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
				app.updateFileState(fileId, { lastVisitAt: Date.now() })
			}
		}
	}, [app, fileId, store.status])

	const overrides = useFileEditorOverrides({ fileSlug })
	const extraDragIconOverrides = useExtraDragIconOverrides()

	const hasFairiesFlag = useValue('show_fairies', () => customFeatureFlags.fairies.get(), [
		customFeatureFlags,
	])

	// Fairy stuff

	// TODO(mime): use TldrawFairyAgent[] type when ready
	const [_agents, setAgents] = useState<any[]>([])
	// filter out deleted fairies (setAgents gets called after a fairy has been deleted)
	const agents = useValue('agents', () => _agents.filter((a) => a.$fairyConfig.get()), [_agents])
	// keep a ref in sync so getUserPresence can read current agents without re-creating the callback
	useEffect(() => {
		agentsRef.current = agents
	}, [agents])

	const instanceComponents = useMemo((): TLComponents => {
		const canShowFairies = app && agents && hasFairiesFlag && (!!user?.isTldraw || isDevelopmentEnv)

		return {
			...components,
			Overlays: () => (
				<>
					{canShowFairies && (
						<Suspense fallback={<div />}>
							<FairyVision agents={agents} />
							<InCanvasTaskList agents={agents} />
							<RemoteFairies />
							<Fairies agents={agents} />
						</Suspense>
					)}
				</>
			),
			InFrontOfTheCanvas: () => (
				<>
					{canShowFairies && (
						<Suspense fallback={<div />}>
							<FairyHUD agents={agents} />
						</Suspense>
					)}
				</>
			),
			DebugMenu: () => (
				<CustomDebugMenu showFairyFeatureFlags={!!user?.isTldraw || isDevelopmentEnv} />
			),
		}
	}, [agents, hasFairiesFlag, user?.isTldraw, app])

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
				components={instanceComponents}
				options={{ actionShortcutsLocation: 'toolbar' }}
				deepLinks={deepLinks || undefined}
				overrides={[overrides, extraDragIconOverrides]}
				getShapeVisibility={getShapeVisibility}
			>
				<ThemeUpdater />
				<SneakyDarkModeSync />
				<SneakyToolSwitcher />
				{app && <SneakyTldrawFileDropHandler />}
				<SneakyLargeFileHander />
				{app && hasFairiesFlag && (
					<Suspense fallback={null}>
						<FairyApp setAgents={setAgents} fileId={fileId} />
					</Suspense>
				)}
			</Tldraw>
		</TlaEditorWrapper>
	)
}

function CustomDebugMenu({ showFairyFeatureFlags }: { showFairyFeatureFlags: boolean }) {
	const app = useMaybeApp()
	const openAndTrack = useOpenUrlAndTrack('unknown')
	const editor = useEditor()
	const isReadOnly = useValue('isReadOnly', () => editor.getIsReadonly(), [editor])
	return (
		<DefaultDebugMenu>
			<A11yAudit />
			{!isReadOnly && app && (
				<>
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
					{!isProductionEnv && (
						<TldrawUiMenuItem
							id="user-manual"
							label="File history (pierre)"
							readonlyOk
							onSelect={() => {
								const url = new URL(window.location.href)
								url.pathname += '/pierre-history'
								openAndTrack(url.toString())
							}}
						/>
					)}
				</>
			)}

			<DefaultDebugMenuContent
				customFeatureFlags={showFairyFeatureFlags ? customFeatureFlags : undefined}
			/>
		</DefaultDebugMenu>
	)
}

const FILE_STATE_UPDATE_INTERVAL = 10_000
class FileStateUpdater {
	disposables = new Set<() => void>()
	constructor(
		private readonly app: TldrawApp,
		private readonly fileId: string,
		editor: Editor
	) {
		this.disposables.add(
			editor.store.listen(
				() => {
					this.didDocumentChange = true
					this.update()
				},
				{ scope: 'document', source: 'user' }
			)
		)
		const flush = () => {
			this.update.flush()
		}
		window.addEventListener('beforeunload', flush)
		this.disposables.add(() => {
			window.removeEventListener('beforeunload', flush)
		})

		const sessionState$ = createSessionStateSnapshotSignal(editor.store)
		let firstTime = true
		this.disposables.add(
			react('update session state', () => {
				const state = sessionState$.get()
				if (firstTime) {
					firstTime = false
					return
				}
				if (!state) return
				this.nextSessionState = state
				this.update()
			})
		)
	}

	private nextSessionState: TLSessionStateSnapshot | null = null
	private didDocumentChange = false

	private update = throttle(
		() => {
			if (!this.nextSessionState && !this.didDocumentChange) return
			const state = this.nextSessionState
			this.nextSessionState = null
			const didChange = this.didDocumentChange
			this.didDocumentChange = false
			this.app.updateFileState(this.fileId, {
				lastSessionState: state ? JSON.stringify(state) : undefined,
				lastEditAt: didChange ? Date.now() : undefined,
				lastVisitAt: Date.now(),
			})
		},
		FILE_STATE_UPDATE_INTERVAL,
		{ trailing: true, leading: false }
	)

	dispose() {
		this.update.flush()
		this.disposables.forEach((dispose) => dispose())
		this.disposables.clear()
	}
}
