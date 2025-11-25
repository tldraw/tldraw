import {
	getLicenseKey,
	ROOM_OPEN_MODE,
	RoomOpenMode,
	RoomOpenModeToPath,
} from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { useCallback, useMemo } from 'react'
import { Editor, TLComponents, Tldraw } from 'tldraw'
import { StoreErrorScreen } from '../../../components/StoreErrorScreen'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useLegacyUrlParams } from '../../../hooks/useLegacyUrlParams'
import { useRoomLoadTracking } from '../../../hooks/useRoomLoadTracking'
import { trackEvent, useHandleUiEvents } from '../../../utils/analytics'
import { assetUrls } from '../../../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../../../utils/config'
import { createAssetFromUrl } from '../../../utils/createAssetFromUrl'
import { globalEditor } from '../../../utils/globalEditor'
import { multiplayerAssetStore } from '../../../utils/multiplayerAssetStore'
import { useMaybeApp } from '../../hooks/useAppState'
import { ReadyWrapper, useSetIsReady } from '../../hooks/useIsReady'
import { TlaEditorErrorFallback } from './editor-components/TlaEditorErrorFallback'
import { TlaEditorLegacySharePanel } from './editor-components/TlaEditorLegacySharePanel'
import { TlaEditorMenuPanel } from './editor-components/TlaEditorMenuPanel'
import { TlaEditorTopPanel } from './editor-components/TlaEditorTopPanel'
import { SneakyDarkModeSync } from './sneaky/SneakyDarkModeSync'
import { SneakyTldrawFileDropHandler } from './sneaky/SneakyFileDropHandler'
import { SneakyLegacyModal } from './sneaky/SneakyLegacyModal'
import { SneakyLegacySetDocumentTitle } from './sneaky/SneakyLegacytSetDocumentTitle'
import { SneakySetDocumentTitle } from './sneaky/SneakySetDocumentTitle'
import { TlaEditorWrapper } from './TlaEditorWrapper'
import { useFileEditorOverrides } from './useFileEditorOverrides'

/** @internal */
export const components: TLComponents = {
	ErrorFallback: TlaEditorErrorFallback,
	MenuPanel: TlaEditorMenuPanel,
	SharePanel: TlaEditorLegacySharePanel,
	TopPanel: TlaEditorTopPanel,
	Dialogs: null,
	Toasts: null,
}

export function TlaLegacyFileEditor({
	roomOpenMode,
	fileSlug,
}: {
	roomOpenMode: RoomOpenMode
	fileSlug: string
}) {
	return (
		<>
			<SneakySetDocumentTitle />
			<ReadyWrapper key={fileSlug}>
				<TlaEditorInner roomOpenMode={roomOpenMode} fileSlug={fileSlug} key={fileSlug} />
			</ReadyWrapper>
		</>
	)
}

function TlaEditorInner({
	fileSlug,
	roomOpenMode,
}: {
	roomOpenMode: RoomOpenMode
	fileSlug: string
}) {
	const app = useMaybeApp()
	const setIsReady = useSetIsReady()

	// make sure this runs before the editor is instantiated
	useLegacyUrlParams()

	const handleUiEvent = useHandleUiEvents()
	const assets = useMemo(() => multiplayerAssetStore(), [])

	const storeWithStatus = useSync({
		uri: `${MULTIPLAYER_SERVER}/${RoomOpenModeToPath[roomOpenMode]}/${fileSlug}`,
		roomId: fileSlug,
		assets,
		trackAnalyticsEvent: trackEvent,
	})

	const fileSystemUiOverrides = useFileEditorOverrides({})

	const isReadonly =
		roomOpenMode === ROOM_OPEN_MODE.READ_ONLY || roomOpenMode === ROOM_OPEN_MODE.READ_ONLY_LEGACY

	const trackRoomLoaded = useRoomLoadTracking()

	const handleMount = useCallback(
		(editor: Editor) => {
			trackRoomLoaded(editor)
			if (!isReadonly) {
				;(window as any).app = editor
				;(window as any).editor = editor
			}
			// Register the editor globally
			globalEditor.set(editor)
			editor.registerExternalAssetHandler('url', createAssetFromUrl)
			setIsReady()
		},
		[isReadonly, trackRoomLoaded, setIsReady]
	)

	if (storeWithStatus.error) {
		setIsReady()
		return <StoreErrorScreen error={storeWithStatus.error} />
	}

	return (
		<TlaEditorWrapper>
			<Tldraw
				className="tla-editor"
				licenseKey={getLicenseKey()}
				store={storeWithStatus}
				assetUrls={assetUrls}
				onMount={handleMount}
				overrides={[fileSystemUiOverrides]}
				initialState={isReadonly ? 'hand' : 'select'}
				onUiEvent={handleUiEvent}
				components={components}
				deepLinks
				options={{ actionShortcutsLocation: 'toolbar' }}
			>
				<ThemeUpdater />
				<SneakyDarkModeSync />
				<SneakyLegacySetDocumentTitle />
				{roomOpenMode === 'read-write' && <SneakyLegacyModal />}
				{app && <SneakyTldrawFileDropHandler />}
			</Tldraw>
		</TlaEditorWrapper>
	)
}
