import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useMemo } from 'react'
import { SerializedSchema, TLComponents, TLRecord, Tldraw } from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useLegacyUrlParams } from '../../../hooks/useLegacyUrlParams'
import { useHandleUiEvents } from '../../../utils/analytics'
import { assetUrls } from '../../../utils/assetUrls'
import { globalEditor } from '../../../utils/globalEditor'
import { TlaEditorTopLeftPanel } from './TlaEditorTopLeftPanel'
import { TlaEditorErrorFallback } from './editor-components/TlaEditorErrorFallback'
import { TlaEditorPublishedSharePanel } from './editor-components/TlaEditorPublishedSharePanel'
import styles from './editor.module.css'
import { SneakyDarkModeSync } from './sneaky/SneakyDarkModeSync'
import { useFileEditorOverrides } from './useFileEditorOverrides'

const components: TLComponents = {
	ErrorFallback: TlaEditorErrorFallback,
	SharePanel: TlaEditorPublishedSharePanel,
	MenuPanel: () => <TlaEditorTopLeftPanel isAnonUser={true} />,
}

interface TlaPublishEditorProps {
	schema: SerializedSchema
	records: TLRecord[]
}

export function TlaPublishEditor({ schema, records }: TlaPublishEditorProps) {
	// make sure this runs before the editor is instantiated
	useLegacyUrlParams()

	const handleUiEvent = useHandleUiEvents()
	const fileEditorOverrides = useFileEditorOverrides({
		fileSlug: undefined,
	})

	const snapshot = useMemo(
		() => ({
			schema,
			store: Object.fromEntries(records.map((record) => [record.id, record])),
		}),
		[schema, records]
	)

	return (
		<div className={styles.editor} data-testid="tla-editor">
			<Tldraw
				licenseKey={getLicenseKey()}
				assetUrls={assetUrls}
				snapshot={snapshot}
				overrides={[fileEditorOverrides]}
				onUiEvent={handleUiEvent}
				onMount={(editor) => {
					;(window as any).app = editor
					;(window as any).editor = editor
					editor.updateInstanceState({ isReadonly: true })
					globalEditor.set(editor)
				}}
				components={components}
				deepLinks
			>
				<ThemeUpdater />
				<SneakyDarkModeSync />
			</Tldraw>
		</div>
	)
}
