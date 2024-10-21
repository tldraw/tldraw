import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useMemo } from 'react'
import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultMainMenu,
	DefaultQuickActions,
	DefaultQuickActionsContent,
	OfflineIndicator,
	SerializedSchema,
	TLComponents,
	TLRecord,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useActions,
	useCollaborationStatus,
} from 'tldraw'
import { useLegacyUrlParams } from '../../../hooks/useLegacyUrlParams'
import { useSharing } from '../../../utils/sharing'
import { SAVE_FILE_COPY_ACTION, useFileSystem } from '../../../utils/useFileSystem'
import { useHandleUiEvents } from '../../../utils/useHandleUiEvent'
import { useMaybeApp } from '../../hooks/useAppState'
import { assetUrls } from '../../providers/TlaProvider'
import { TlaEditorTopLeftPanel } from './TlaEditorTopLeftPanel'

const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
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
	MenuPanel: () => {
		const app = useMaybeApp()
		return <TlaEditorTopLeftPanel isAnonUser={!app} />
	},
	TopPanel: () => {
		const collaborationStatus = useCollaborationStatus()
		if (collaborationStatus === 'offline') return null
		return <OfflineIndicator />
	},
	QuickActions: () => {
		return (
			<DefaultQuickActions>
				<DefaultMainMenu />
				<DefaultQuickActionsContent />
			</DefaultQuickActions>
		)
	},
}

interface TlaSnapshotEditorProps {
	schema: SerializedSchema
	records: TLRecord[]
}

export function TlaSnapshotsEditor({ schema, records }: TlaSnapshotEditorProps) {
	// make sure this runs before the editor is instantiated
	useLegacyUrlParams()

	const handleUiEvent = useHandleUiEvents()
	const sharingUiOverrides = useSharing()
	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: true })

	const snapshot = useMemo(
		() => ({
			schema,
			store: Object.fromEntries(records.map((record) => [record.id, record])),
		}),
		[schema, records]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				licenseKey={getLicenseKey()}
				assetUrls={assetUrls}
				snapshot={snapshot}
				overrides={[sharingUiOverrides, fileSystemUiOverrides]}
				onUiEvent={handleUiEvent}
				onMount={(editor) => {
					;(window as any).app = editor
					;(window as any).editor = editor
					editor.updateInstanceState({ isReadonly: true })
				}}
				components={components}
				deepLinks
				inferDarkMode
			/>
		</div>
	)
}
