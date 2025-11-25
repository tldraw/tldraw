import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useCallback, useMemo } from 'react'
import { Editor, TLComponents, Tldraw, TLStoreSnapshot } from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useLegacyUrlParams } from '../../../hooks/useLegacyUrlParams'
import { useHandleUiEvents } from '../../../utils/analytics'
import { assetUrls } from '../../../utils/assetUrls'
import { globalEditor } from '../../../utils/globalEditor'
import { useMaybeApp } from '../../hooks/useAppState'
import { ReadyWrapper, useSetIsReady } from '../../hooks/useIsReady'
import { F } from '../../utils/i18n'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'
import { TlaEditorErrorFallback } from './editor-components/TlaEditorErrorFallback'
import { SneakyDarkModeSync } from './sneaky/SneakyDarkModeSync'
import { SneakyTldrawFileDropHandler } from './sneaky/SneakyFileDropHandler'
import { SneakyLegacySetDocumentTitle } from './sneaky/SneakyLegacytSetDocumentTitle'
import { SneakySetDocumentTitle } from './sneaky/SneakySetDocumentTitle'
import { TlaEditorWrapper } from './TlaEditorWrapper'
import { useFileEditorOverrides } from './useFileEditorOverrides'

export function TlaHistorySnapshotEditor({
	fileSlug,
	snapshot,
	onRestore,
}: {
	fileSlug: string
	snapshot: TLStoreSnapshot
	onRestore(): Promise<void>
}) {
	return (
		<>
			<SneakySetDocumentTitle />
			<ReadyWrapper key={fileSlug}>
				<TlaEditorInner snapshot={snapshot} onRestore={onRestore} />
			</ReadyWrapper>
		</>
	)
}

function TlaEditorInner({
	snapshot,
	onRestore,
}: {
	snapshot: TLStoreSnapshot
	onRestore(): Promise<void>
}) {
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

	const components = useMemo((): TLComponents => {
		return {
			ErrorFallback: TlaEditorErrorFallback,
			SharePanel: () => (
				<TlaCtaButton
					canvas
					style={{
						pointerEvents: 'all',
						margin: 6,
					}}
					onClick={() => {
						const sure = window.confirm('Are you sure?')
						if (!sure) return
						onRestore()
							.then(() => {
								window.alert('done')
							})
							.catch((error) => {
								window.alert('Something went wrong!')
								console.error(error)
							})
					}}
				>
					<F defaultMessage="Restore version"></F>
				</TlaCtaButton>
			),
		}
	}, [onRestore])

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
