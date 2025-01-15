import {
	getLicenseKey,
	ROOM_OPEN_MODE,
	RoomOpenModeToPath,
	type RoomOpenMode,
} from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { useCallback } from 'react'
import {
	assertExists,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultMainMenu,
	Editor,
	EditSubmenu,
	ExportFileContentSubMenu,
	ExtrasGroup,
	PeopleMenu,
	PreferencesGroup,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useActions,
	useEditor,
	useTranslation,
	useValue,
	ViewSubmenu,
} from 'tldraw'
import { useLegacyUrlParams } from '../hooks/useLegacyUrlParams'
import { assetUrls } from '../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../utils/config'
import { createAssetFromUrl } from '../utils/createAssetFromUrl'
import { multiplayerAssetStore } from '../utils/multiplayerAssetStore'
import { useSharing } from '../utils/sharing'
import { trackAnalyticsEvent } from '../utils/trackAnalyticsEvent'
import { OPEN_FILE_ACTION, SAVE_FILE_COPY_ACTION, useFileSystem } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { DocumentTopZone } from './DocumentName/DocumentName'
import { MultiplayerFileMenu } from './FileMenu'
import { LegacyLinks } from './Links'
import { ShareMenu } from './ShareMenu'
import { SneakyOnDropOverride } from './SneakyOnDropOverride'
import { StoreErrorScreen } from './StoreErrorScreen'
import { ThemeUpdater } from './ThemeUpdater/ThemeUpdater'

const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
	MainMenu: () => (
		<DefaultMainMenu>
			<TldrawUiMenuGroup id="basic">
				<MultiplayerFileMenu />
				<EditSubmenu />
				<ViewSubmenu />
				<ExportFileContentSubMenu />
				<ExtrasGroup />
			</TldrawUiMenuGroup>
			<PreferencesGroup />
			<LegacyLinks />
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
			</DefaultKeyboardShortcutsDialog>
		)
	},
	TopPanel: () => {
		const editor = useEditor()
		const isOffline = useValue(
			'offline',
			() => {
				const status = assertExists(
					editor.store.props.collaboration?.status,
					'should be used with multiplayer store'
				)
				return status.get() === 'offline'
			},
			[]
		)
		return <DocumentTopZone isOffline={isOffline} />
	},
	SharePanel: () => {
		const editor = useEditor()
		const msg = useTranslation()
		return (
			<div className="tlui-share-zone" draggable={false}>
				{/* Legacy, display the user when the user is the only one connected */}
				<PeopleMenu displayUserWhenAlone>
					<div className="tlui-people-menu__section">
						<TldrawUiButton
							type="menu"
							data-testid="people-menu.invite"
							onClick={() => editor.menus.addOpenMenu('share menu')}
						>
							<TldrawUiButtonLabel>{msg('people-menu.invite')}</TldrawUiButtonLabel>
							<TldrawUiButtonIcon icon="plus" />
						</TldrawUiButton>
					</div>
				</PeopleMenu>
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
	// make sure this runs before the editor is instantiated
	useLegacyUrlParams()

	const handleUiEvent = useHandleUiEvents()

	const storeWithStatus = useSync({
		uri: `${MULTIPLAYER_SERVER}/${RoomOpenModeToPath[roomOpenMode]}/${roomSlug}`,
		roomId: roomSlug,
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
				overrides={[sharingUiOverrides, fileSystemUiOverrides]}
				initialState={isReadonly ? 'hand' : 'select'}
				onUiEvent={handleUiEvent}
				components={components}
				deepLinks
			>
				<SneakyOnDropOverride isMultiplayer />
				<ThemeUpdater />
			</Tldraw>
		</div>
	)
}
