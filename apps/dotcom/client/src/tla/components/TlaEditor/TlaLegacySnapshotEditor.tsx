import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useCallback } from 'react'
import { Editor, TLComponents, TLStoreSnapshot, Tldraw } from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useLegacyUrlParams } from '../../../hooks/useLegacyUrlParams'
import { useHandleUiEvents } from '../../../utils/analytics'
import { assetUrls } from '../../../utils/assetUrls'
import { globalEditor } from '../../../utils/globalEditor'
import { useMaybeApp } from '../../hooks/useAppState'
import { ReadyWrapper, useSetIsReady } from '../../hooks/useIsReady'
import { TlaEditorWrapper } from './TlaEditorWrapper'
import { TlaEditorErrorFallback } from './editor-components/TlaEditorErrorFallback'
import { TlaEditorLegacySharePanel } from './editor-components/TlaEditorLegacySharePanel'
import { TlaEditorMenuPanel } from './editor-components/TlaEditorMenuPanel'
import { TlaEditorTopPanel } from './editor-components/TlaEditorTopPanel'
import { SneakyDarkModeSync } from './sneaky/SneakyDarkModeSync'
import { SneakyTldrawFileDropHandler } from './sneaky/SneakyFileDropHandler'
import { SneakyLegacySetDocumentTitle } from './sneaky/SneakyLegacytSetDocumentTitle'
import { SneakySetDocumentTitle } from './sneaky/SneakySetDocumentTitle'
import { useFileEditorOverrides } from './useFileEditorOverrides'

/** @internal */
export const components: TLComponents = {
	ErrorFallback: TlaEditorErrorFallback,
	MenuPanel: TlaEditorMenuPanel,
	SharePanel: TlaEditorLegacySharePanel,
	TopPanel: TlaEditorTopPanel,
}

export function TlaLegacySnapshotEditor({
	snapshot,
	fileSlug,
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

	const fileSystemUiOverrides = useFileEditorOverrides({})

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
				licenseKey={getLicenseKey()}
				snapshot={snapshot}
				assetUrls={assetUrls}
				onMount={handleMount}
				overrides={[fileSystemUiOverrides]}
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
