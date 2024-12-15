import { ROOM_OPEN_MODE, RoomOpenMode, RoomOpenModeToPath } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	Editor,
	OfflineIndicator,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useActions,
	useCollaborationStatus,
} from 'tldraw'
import { StoreErrorScreen } from '../../../components/StoreErrorScreen'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useLegacyUrlParams } from '../../../hooks/useLegacyUrlParams'
import { assetUrls } from '../../../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../../../utils/config'
import { createAssetFromUrl } from '../../../utils/createAssetFromUrl'
import { multiplayerAssetStore } from '../../../utils/multiplayerAssetStore'
import { useSharing } from '../../../utils/sharing'
import { trackAnalyticsEvent } from '../../../utils/trackAnalyticsEvent'
import { SAVE_FILE_COPY_ACTION, useFileSystem } from '../../../utils/useFileSystem'
import { useHandleUiEvents } from '../../../utils/useHandleUiEvent'
import { useMaybeApp } from '../../hooks/useAppState'
import { ReadyWrapper, useSetIsReady } from '../../hooks/useIsReady'
import { useMsg } from '../../utils/i18n'
import { SneakyDarkModeSync } from './SneakyDarkModeSync'
import { TlaEditorTopLeftPanel } from './TlaEditorTopLeftPanel'
import { TlaEditorTopRightPanel } from './TlaEditorTopRightPanel'
import { TlaEditorWrapper } from './TlaEditorWrapper'
import { editorMessages as messages } from './editor-messages'
import styles from './editor.module.css'
import { SetDocumentTitle } from './sneaky/SetDocumentTitle'
import { SneakyTldrawFileDropHandler } from './sneaky/SneakyFileDropHandler'

/** @internal */
export const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
	KeyboardShortcutsDialog: (props) => {
		const actions = useActions()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuGroup label={useMsg(messages.file)} id="file">
					<TldrawUiMenuItem {...actions[SAVE_FILE_COPY_ACTION]} />
				</TldrawUiMenuGroup>
				<DefaultKeyboardShortcutsDialogContent />
			</DefaultKeyboardShortcutsDialog>
		)
	},
	MenuPanel: () => {
		const app = useMaybeApp()
		return <TlaEditorTopLeftPanel isAnonUser={!app} />
	},
	SharePanel: () => {
		const app = useMaybeApp()
		const fileSlug = useParams<{ fileSlug: string }>().fileSlug
		return <TlaEditorTopRightPanel isAnonUser={!app} context={fileSlug ? 'file' : 'scratch'} />
	},
	TopPanel: () => {
		const collaborationStatus = useCollaborationStatus()
		if (collaborationStatus === 'offline') {
			return (
				<div className={styles.offlineIndicatorWrapper}>
					<OfflineIndicator />{' '}
				</div>
			)
		}
		return null
	},
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
			<SetDocumentTitle />
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
				{app && <SneakyTldrawFileDropHandler />}
			</Tldraw>
		</TlaEditorWrapper>
	)
}
