import { getLicenseKey, ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { createContext, useCallback, useContext } from 'react'
import { Editor, fetch, TLComponents, Tldraw, TLStoreSnapshot } from 'tldraw'
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

const TlaHistorySnapshotEditorContext = createContext<{
	fileSlug: string
	timestamp: string
	isApp: boolean
}>({
	fileSlug: '',
	timestamp: '',
	isApp: false,
})

/** @internal */
export const components: TLComponents = {
	ErrorFallback: TlaEditorErrorFallback,
	SharePanel: () => {
		const { fileSlug, timestamp, isApp } = useContext(TlaHistorySnapshotEditorContext)

		const restoreVersion = useCallback(async () => {
			const sure = window.confirm('Are you sure?')
			if (!sure) return

			const res = await fetch(
				isApp ? `/api/app/file/${fileSlug}/restore` : `/api/${ROOM_PREFIX}/${fileSlug}/restore`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ timestamp }),
				}
			)

			if (!res.ok) {
				window.alert('Something went wrong!')
				return
			}

			window.alert('done')
		}, [fileSlug, timestamp, isApp])

		return (
			<TlaCtaButton
				style={{
					pointerEvents: 'all',
					margin: 6,
				}}
				onClick={restoreVersion}
			>
				<F defaultMessage="Restore version"></F>
			</TlaCtaButton>
		)
	},
}

export function TlaHistorySnapshotEditor({
	fileSlug,
	snapshot,
	timestamp,
	isApp,
}: {
	fileSlug: string
	snapshot: TLStoreSnapshot
	timestamp: string
	isApp: boolean
}) {
	return (
		<TlaHistorySnapshotEditorContext.Provider value={{ fileSlug, timestamp, isApp }}>
			<SneakySetDocumentTitle />
			<ReadyWrapper key={fileSlug}>
				<TlaEditorInner snapshot={snapshot} />
			</ReadyWrapper>
		</TlaHistorySnapshotEditorContext.Provider>
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
