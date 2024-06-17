import {
	DefaultHelpMenu,
	DefaultHelpMenuContent,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultMainMenu,
	DefaultMainMenuContent,
	SerializedSchema,
	TLComponents,
	TLRecord,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useActions,
} from 'tldraw'
import { UrlStateSync } from '../components/MultiplayerEditor'
import { StoreErrorScreen } from '../components/StoreErrorScreen'
import { useLocalStore } from '../hooks/useLocalStore'
import { assetUrls } from '../utils/assetUrls'
import { DebugMenuItems } from '../utils/migration/DebugMenuItems'
import { useSharing } from '../utils/sharing'
import { SAVE_FILE_COPY_ACTION, useFileSystem } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { ExportMenu } from './ExportMenu'
import { MultiplayerFileMenu } from './FileMenu'
import { Links } from './Links'

const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
	HelpMenu: () => (
		<DefaultHelpMenu>
			<TldrawUiMenuGroup id="help">
				<DefaultHelpMenuContent />
			</TldrawUiMenuGroup>
			<Links />
		</DefaultHelpMenu>
	),
	MainMenu: () => (
		<DefaultMainMenu>
			<MultiplayerFileMenu />
			<DefaultMainMenuContent />
		</DefaultMainMenu>
	),
	KeyboardShortcutsDialog: (props) => {
		const actions = useActions()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuGroup label="shortcuts-dialog.file" id="file">
					<TldrawUiMenuItem {...actions[SAVE_FILE_COPY_ACTION]} />
				</TldrawUiMenuGroup>
				<DefaultKeyboardShortcutsDialogContent />
			</DefaultKeyboardShortcutsDialog>
		)
	},
	SharePanel: () => {
		return (
			<div className="tlui-share-zone" draggable={false}>
				<ExportMenu />
			</div>
		)
	},
}

interface SnapshotEditorProps {
	schema: SerializedSchema
	records: TLRecord[]
}

export function SnapshotsEditor(props: SnapshotEditorProps) {
	const handleUiEvent = useHandleUiEvents()
	const sharingUiOverrides = useSharing()
	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: true })
	const storeResult = useLocalStore(props.records, props.schema)
	if (!storeResult?.ok) return <StoreErrorScreen error={new Error(storeResult?.error)} />

	return (
		<div className="tldraw__editor">
			<Tldraw
				assetUrls={assetUrls}
				store={storeResult.value}
				overrides={[sharingUiOverrides, fileSystemUiOverrides]}
				onUiEvent={handleUiEvent}
				onMount={(editor) => {
					;(window as any).app = editor
					;(window as any).editor = editor
					editor.updateInstanceState({ isReadonly: true })
				}}
				components={components}
				renderDebugMenuItems={() => <DebugMenuItems />}
				inferDarkMode
			>
				<UrlStateSync />
			</Tldraw>
		</div>
	)
}
