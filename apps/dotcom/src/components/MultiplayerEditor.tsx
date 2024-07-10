import {
	getLicenseKey,
	ROOM_OPEN_MODE,
	RoomOpenModeToPath,
	type RoomOpenMode,
} from '@tldraw/dotcom-shared'
import { useMultiplayerSync } from '@tldraw/sync-react'
import { useCallback, useEffect } from 'react'
import {
	atom,
	DefaultContextMenu,
	DefaultContextMenuContent,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultMainMenu,
	Editor,
	EditSubmenu,
	ExportFileContentSubMenu,
	ExtrasGroup,
	HelpGroup,
	PreferencesGroup,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useActions,
	useValue,
	ViewSubmenu,
} from 'tldraw'
import { UrlStateParams, useUrlState } from '../hooks/useUrlState'
import { assetUrls } from '../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../utils/config'
import { CursorChatMenuItem } from '../utils/context-menu/CursorChatMenuItem'
import { createAssetFromUrl } from '../utils/createAssetFromUrl'
import { multiplayerAssetStore } from '../utils/multiplayerAssetStore'
import { useSharing } from '../utils/sharing'
import { CURSOR_CHAT_ACTION, useCursorChat } from '../utils/useCursorChat'
import { OPEN_FILE_ACTION, SAVE_FILE_COPY_ACTION, useFileSystem } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { CursorChatBubble } from './CursorChatBubble'
import { DocumentTopZone } from './DocumentName/DocumentName'
import { MultiplayerFileMenu } from './FileMenu'
import { Links } from './Links'
import { PeopleMenu } from './PeopleMenu/PeopleMenu'
import { ShareMenu } from './ShareMenu'
import { SneakyOnDropOverride } from './SneakyOnDropOverride'
import { StoreErrorScreen } from './StoreErrorScreen'
import { ThemeUpdater } from './ThemeUpdater/ThemeUpdater'

const shittyOfflineAtom = atom('shitty offline atom', false)

const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
	ContextMenu: (props) => (
		<DefaultContextMenu {...props}>
			<CursorChatMenuItem />
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	),
	MainMenu: () => (
		<DefaultMainMenu>
			<MultiplayerFileMenu />
			<EditSubmenu />
			<ViewSubmenu />
			<ExportFileContentSubMenu />
			<ExtrasGroup />
			<PreferencesGroup />
			<HelpGroup />
			<Links />
		</DefaultMainMenu>
	),
	KeyboardShortcutsDialog: (props) => {
		const actions = useActions()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuGroup label="shortcuts-dialog.file" id="file">
					<TldrawUiMenuItem {...actions[SAVE_FILE_COPY_ACTION]} />
					<TldrawUiMenuItem {...actions[OPEN_FILE_ACTION]} />
				</TldrawUiMenuGroup>
				<DefaultKeyboardShortcutsDialogContent />
				<TldrawUiMenuGroup label="shortcuts-dialog.collaboration" id="collaboration">
					<TldrawUiMenuItem {...actions[CURSOR_CHAT_ACTION]} />
				</TldrawUiMenuGroup>
			</DefaultKeyboardShortcutsDialog>
		)
	},
	TopPanel: () => {
		const isOffline = useValue('offline', () => shittyOfflineAtom.get(), [])
		return <DocumentTopZone isOffline={isOffline} />
	},
	SharePanel: () => {
		return (
			<div className="tlui-share-zone" draggable={false}>
				<PeopleMenu />
				<ShareMenu />
			</div>
		)
	},
}

export function MultiplayerEditor({
	roomOpenMode,
	roomSlug,
}: {
	roomOpenMode: RoomOpenMode
	roomSlug: string
}) {
	const handleUiEvent = useHandleUiEvents()

	const storeWithStatus = useMultiplayerSync({
		uri: `${MULTIPLAYER_SERVER}/${RoomOpenModeToPath[roomOpenMode]}/${roomSlug}`,
		roomId: roomSlug,
		assets: multiplayerAssetStore,
	})

	const isOffline =
		storeWithStatus.status === 'synced-remote' && storeWithStatus.connectionStatus === 'offline'
	useEffect(() => {
		shittyOfflineAtom.set(isOffline)
	}, [isOffline])

	const sharingUiOverrides = useSharing()
	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: true })
	const cursorChatOverrides = useCursorChat()
	const isReadonly =
		roomOpenMode === ROOM_OPEN_MODE.READ_ONLY || roomOpenMode === ROOM_OPEN_MODE.READ_ONLY_LEGACY

	const handleMount = useCallback(
		(editor: Editor) => {
			if (!isReadonly) {
				;(window as any).app = editor
				;(window as any).editor = editor
			}
			editor.updateInstanceState({
				isReadonly,
			})
			editor.registerExternalAssetHandler('url', createAssetFromUrl)
		},
		[isReadonly]
	)

	if (storeWithStatus.error) {
		return <StoreErrorScreen error={storeWithStatus.error} />
	}

	return (
		<div className="tldraw__editor">
			<Tldraw
				licenseKey={getLicenseKey()}
				store={storeWithStatus}
				assetUrls={assetUrls}
				onMount={handleMount}
				overrides={[sharingUiOverrides, fileSystemUiOverrides, cursorChatOverrides]}
				initialState={isReadonly ? 'hand' : 'select'}
				onUiEvent={handleUiEvent}
				components={components}
				inferDarkMode
			>
				<UrlStateSync />
				<CursorChatBubble />
				<SneakyOnDropOverride isMultiplayer />
				<ThemeUpdater />
			</Tldraw>
		</div>
	)
}

export function UrlStateSync() {
	const syncViewport = useCallback((params: UrlStateParams) => {
		window.history.replaceState(
			{},
			document.title,
			window.location.pathname + `?v=${params.v}&p=${params.p}`
		)
	}, [])

	useUrlState(syncViewport)

	return null
}
