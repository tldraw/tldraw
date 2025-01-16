import { ROOM_OPEN_MODE, RoomOpenMode, RoomOpenModeToPath } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { useCallback } from 'react'
import { Editor, TLComponents, Tldraw } from 'tldraw'
import { StoreErrorScreen } from '../../../components/StoreErrorScreen'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useLegacyUrlParams } from '../../../hooks/useLegacyUrlParams'
import { assetUrls } from '../../../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../../../utils/config'
import { createAssetFromUrl } from '../../../utils/createAssetFromUrl'
import { globalEditor } from '../../../utils/globalEditor'
import { multiplayerAssetStore } from '../../../utils/multiplayerAssetStore'
import { useSharing } from '../../../utils/sharing'
import { trackAnalyticsEvent } from '../../../utils/trackAnalyticsEvent'
import { useFileSystem } from '../../../utils/useFileSystem'
import { useHandleUiEvents } from '../../../utils/useHandleUiEvent'
import { useMaybeApp } from '../../hooks/useAppState'
import { ReadyWrapper, useSetIsReady } from '../../hooks/useIsReady'
import { SneakyDarkModeSync } from './SneakyDarkModeSync'
import { TlaEditorWrapper } from './TlaEditorWrapper'
import { TlaEditorErrorFallback } from './editor-components/TlaEditorErrorFallback'
import { TlaEditorKeyboardShortcutsDialog } from './editor-components/TlaEditorKeyboardShortcutsDialog'
import { TlaEditorLegacySharePanel } from './editor-components/TlaEditorLegacySharePanel'
import { TlaEditorMenuPanel } from './editor-components/TlaEditorMenuPanel'
import { TlaEditorTopPanel } from './editor-components/TlaEditorTopPanel'
import { SneakyTldrawFileDropHandler } from './sneaky/SneakyFileDropHandler'
import { SneakyLegacySetDocumentTitle } from './sneaky/SneakyLegacytSetDocumentTitle'
import { SneakySetDocumentTitle } from './sneaky/SneakySetDocumentTitle'

/** @internal */
export const components: TLComponents = {
	ErrorFallback: TlaEditorErrorFallback,
	KeyboardShortcutsDialog: TlaEditorKeyboardShortcutsDialog,
	MenuPanel: TlaEditorMenuPanel,
	SharePanel: TlaEditorLegacySharePanel,
	TopPanel: TlaEditorTopPanel,
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

	const storeWithStatus = useSync({
		uri: `${MULTIPLAYER_SERVER}/${RoomOpenModeToPath[roomOpenMode]}/${fileSlug}`,
		roomId: fileSlug,
		assets: multiplayerAssetStore,
		trackAnalyticsEvent,
	})

	const sharingUiOverrides = useSharing()
	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: true })

	const isReadonly =
		roomOpenMode === ROOM_OPEN_MODE.READ_ONLY || roomOpenMode === ROOM_OPEN_MODE.READ_ONLY_LEGACY

	const handleMount = useCallback(
		(editor: Editor) => {
			if (!isReadonly) {
				;(window as any).app = editor
				;(window as any).editor = editor
			}
			// Register the editor globally
			globalEditor.set(editor)
			editor.registerExternalAssetHandler('url', createAssetFromUrl)
			setIsReady()
		},
		[isReadonly, setIsReady]
	)

	if (storeWithStatus.error) {
		return <StoreErrorScreen error={storeWithStatus.error} />
	}

	return (
		<TlaEditorWrapper>
			<Tldraw
				className="tla-editor"
				store={storeWithStatus}
				assetUrls={assetUrls}
				onMount={handleMount}
				overrides={[sharingUiOverrides, fileSystemUiOverrides]}
				initialState={isReadonly ? 'hand' : 'select'}
				onUiEvent={handleUiEvent}
				components={components}
				deepLinks
				options={{ actionShortcutsLocation: 'toolbar' }}
			>
				<ThemeUpdater />
				<SneakyDarkModeSync />
				<SneakyLegacySetDocumentTitle />
				{app && <SneakyTldrawFileDropHandler />}
			</Tldraw>
		</TlaEditorWrapper>
	)
}
