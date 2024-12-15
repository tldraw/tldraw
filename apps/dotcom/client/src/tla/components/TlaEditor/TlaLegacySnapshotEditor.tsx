import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	Editor,
	OfflineIndicator,
	TLComponents,
	TLStoreSnapshot,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useActions,
	useCollaborationStatus,
} from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useLegacyUrlParams } from '../../../hooks/useLegacyUrlParams'
import { assetUrls } from '../../../utils/assetUrls'
import { useSharing } from '../../../utils/sharing'
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

export function TlaLegacySnapshotEditor({
	fileSlug,
	snapshot,
}: {
	fileSlug: string
	snapshot: TLStoreSnapshot
}) {
	return (
		<>
			<SetDocumentTitle />
			<ReadyWrapper key={fileSlug}>
				<TlaEditorInner snapshot={snapshot} />
			</ReadyWrapper>
		</>
	)
}

function TlaEditorInner({ snapshot }: { snapshot: TLStoreSnapshot }) {
	const app = useMaybeApp()

	const setIsReady = useSetIsReady()

	// make sure this runs before the editor is instantiated
	useLegacyUrlParams()

	const handleUiEvent = useHandleUiEvents()

	const sharingUiOverrides = useSharing()
	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: true })

	const handleMount = useCallback(
		(editor: Editor) => {
			;(window as any).app = editor
			;(window as any).editor = editor
			editor.updateInstanceState({ isReadonly: true })
			setIsReady()
		},
		[setIsReady]
	)

	return (
		<TlaEditorWrapper>
			<Tldraw
				className="tla-editor"
				snapshot={snapshot}
				assetUrls={assetUrls}
				onMount={handleMount}
				overrides={[sharingUiOverrides, fileSystemUiOverrides]}
				initialState={'hand'}
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
