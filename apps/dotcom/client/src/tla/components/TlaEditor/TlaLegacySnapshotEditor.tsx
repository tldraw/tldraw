import { useCallback } from 'react'
import { Editor, TLComponents, TLStoreSnapshot, Tldraw } from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useLegacyUrlParams } from '../../../hooks/useLegacyUrlParams'
import { assetUrls } from '../../../utils/assetUrls'
import { globalEditor } from '../../../utils/globalEditor'
import { useSharing } from '../../../utils/sharing'
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

export function TlaLegacySnapshotEditor({
	fileSlug,
	snapshot,
}: {
	fileSlug: string
	snapshot: TLStoreSnapshot
}) {
	return (
		<>
			<SneakySetDocumentTitle />
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
			// Register the editor globally
			globalEditor.set(editor)
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
				<SneakyLegacySetDocumentTitle />
				{app && <SneakyTldrawFileDropHandler />}
			</Tldraw>
		</TlaEditorWrapper>
	)
}
