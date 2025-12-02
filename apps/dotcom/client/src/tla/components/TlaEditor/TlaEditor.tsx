import { TLCustomServerEvent, getLicenseKey } from '@tldraw/dotcom-shared'
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
	TldrawOverlays,
	TldrawUiMenuItem,
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
import { isProductionEnv } from '../../../utils/env'
import { globalEditor } from '../../../utils/globalEditor'
import { multiplayerAssetStore } from '../../../utils/multiplayerAssetStore'
import { TldrawApp } from '../../app/TldrawApp'
import { useMaybeApp } from '../../hooks/useAppState'
import { useFairyAccess, useShouldShowFairies } from '../../hooks/useFairyAccess'
import { ReadyWrapper, useSetIsReady } from '../../hooks/useIsReady'
import { useNewRoomCreationTracking } from '../../hooks/useNewRoomCreationTracking'
import { useTldrawUser } from '../../hooks/useUser'
import { useAreFairiesEnabled } from '../../utils/local-session-state'
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

// eslint-disable-next-line local/no-fairy-imports -- ok for types
import { type FairyApp } from '../../../fairy/fairy-app/FairyApp'
import { useFeatureFlags } from '../../hooks/useFeatureFlags'

// Lazy load fairy components

const FairyAppProvider = lazy(() =>
	import('../../../fairy/fairy-app/FairyAppProvider').then((m) => ({
		default: m.FairyAppProvider,
	}))
)
const FairyHUD = lazy(() =>
	import('../../../fairy/fairy-ui/FairyHUD').then((m) => ({ default: m.FairyHUD }))
)
const Fairies = lazy(() =>
	import('../../../fairy/fairy-canvas-ui/Fairies').then((m) => ({ default: m.Fairies }))
)
const RemoteFairies = lazy(() =>
	import('../../../fairy/fairy-canvas-ui/RemoteFairies').then((m) => ({ default: m.RemoteFairies }))
)
const FairyHUDTeaser = lazy(() =>
	import('../../../fairy/fairy-ui/FairyHUDTeaser').then((m) => ({ default: m.FairyHUDTeaser }))
)
const FairyAppContextProvider = lazy(() =>
	import('../../../fairy/fairy-app/FairyAppProvider').then((m) => ({
		default: m.FairyAppContextProvider,
	}))
)

/** @internal */
export const components: TLComponents = {
	ErrorFallback: TlaEditorErrorFallback,
	MenuPanel: TlaEditorMenuPanel,
	TopPanel: TlaEditorTopPanel,
	SharePanel: TlaEditorSharePanel,
	Dialogs: null,
	Toasts: null,

	InFrontOfTheCanvas: () => (
		<Suspense fallback={<div />}>
			<FairyHUDTeaser />
		</Suspense>
	),
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

	const [hoistedFairyApp, setHoistedFairyApp] = useState<FairyApp | null>(null)

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

				if (!hoistedFairyApp) return defaultPresence

				// Add fairy positions to presence for all active agents
				const fairyPresences =
					hoistedFairyApp.agents
						.getAgents()
						.map((agent) => {
							const entity = agent.getEntity()
							const outfit = agent.getConfig().outfit as unknown as string | undefined
							if (!entity || !outfit) return null
							return { entity, outfit }
						})
						.filter((agent): agent is NonNullable<typeof agent> => agent !== null) ?? []

				defaultPresence.meta = { ...defaultPresence.meta, fairies: fairyPresences }
				return defaultPresence
			},
			[hoistedFairyApp]
		),
	})

	const handleUnmount = useCallback(() => {
		setHoistedFairyApp(null)
	}, [])

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

	const hasFairyAccess = useFairyAccess()
	const areFairiesEnabled = useAreFairiesEnabled()
	const shouldShowFairies = useShouldShowFairies()
	const { flags, isLoaded } = useFeatureFlags()

	const RemoteFairiesDelayed = ({ enableForMe }: { enableForMe: boolean }) => {
		const editor = useEditor()
		const collaborators = editor.getCollaborators()
		const doesAnybodyHaveFairiesEnabled = collaborators.some(
			// @ts-ignore meh it's fine
			(collaborator) => collaborator.meta?.fairies?.length > 0
		)
		return enableForMe || doesAnybodyHaveFairiesEnabled ? (
			<Suspense fallback={<div />}>
				<RemoteFairies />
			</Suspense>
		) : null
	}

	const instanceComponents = useMemo((): TLComponents => {
		// User can control their own fairies if they have fairy access and it's enabled
		const canControlFairies = app && hasFairyAccess && areFairiesEnabled

		// Show fairy UI (HUD, remote fairies) if feature flag is enabled and local toggle is on
		// This allows guests to see fairies on shared files without requiring login
		const shouldShowFairyUI = shouldShowFairies && areFairiesEnabled

		const shouldShowTeaser =
			isLoaded &&
			flags.fairies.enabled &&
			flags.fairies_purchase.enabled &&
			!hasFairyAccess &&
			areFairiesEnabled
		return {
			...components,
			Overlays: () => {
				return (
					<>
						<TldrawOverlays />
						<RemoteFairiesDelayed enableForMe={!!(shouldShowFairyUI && hoistedFairyApp)} />
						{shouldShowFairyUI && hoistedFairyApp ? (
							<Suspense fallback={<div />}>
								<FairyAppContextProvider fairyApp={hoistedFairyApp}>
									{/* <DebugFairyVision agents={agents} /> */}
									{canControlFairies && <Fairies />}
								</FairyAppContextProvider>
							</Suspense>
						) : null}
					</>
				)
			},
			InFrontOfTheCanvas: () => {
				return (
					<>
						{shouldShowFairyUI && hoistedFairyApp ? (
							<Suspense fallback={<div />}>
								<FairyAppContextProvider fairyApp={hoistedFairyApp}>
									{canControlFairies ? <FairyHUD /> : <FairyHUDTeaser />}
								</FairyAppContextProvider>
							</Suspense>
						) : (
							shouldShowTeaser && (
								<Suspense fallback={<div />}>
									<FairyHUDTeaser />
								</Suspense>
							)
						)}
					</>
				)
			},
			DebugMenu: () => <CustomDebugMenu />,
		}
	}, [
		isLoaded,
		flags.fairies.enabled,
		flags.fairies_purchase.enabled,
		app,
		hasFairyAccess,
		areFairiesEnabled,
		shouldShowFairies,
		hoistedFairyApp,
	])

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
				{app && hasFairyAccess && areFairiesEnabled && (
					<Suspense fallback={null}>
						<FairyAppProvider
							fileId={fileId}
							onMount={setHoistedFairyApp}
							onUnmount={handleUnmount}
						/>
					</Suspense>
				)}
			</Tldraw>
		</TlaEditorWrapper>
	)
}

function CustomDebugMenu() {
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
			<DefaultDebugMenuContent />
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
