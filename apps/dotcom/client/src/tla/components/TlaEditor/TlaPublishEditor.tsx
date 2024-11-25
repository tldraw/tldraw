import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useMemo, useRef } from 'react'
import { SerializedSchema, TLComponents, TLRecord, Tldraw, usePassThroughWheelEvents } from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useLegacyUrlParams } from '../../../hooks/useLegacyUrlParams'
import { assetUrls } from '../../../utils/assetUrls'
import { globalEditor } from '../../../utils/globalEditor'
import { useSharing } from '../../../utils/sharing'
import { useFileSystem } from '../../../utils/useFileSystem'
import { useHandleUiEvents } from '../../../utils/useHandleUiEvent'
import { useMaybeApp } from '../../hooks/useAppState'
import { SneakyDarkModeSync } from './SneakyDarkModeSync'
import { TlaEditorTopLeftPanel } from './TlaEditorTopLeftPanel'
import { TlaEditorTopRightPanel } from './TlaEditorTopRightPanel'
import styles from './editor.module.css'

const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
	SharePanel: () => {
		const ref = useRef<HTMLDivElement>(null)
		usePassThroughWheelEvents(ref)
		const isAnonUser = !useMaybeApp()
		return <TlaEditorTopRightPanel isAnonUser={isAnonUser} context="published-file" />
	},
	MenuPanel: () => {
		const isAnonUser = !useMaybeApp()
		return <TlaEditorTopLeftPanel isAnonUser={isAnonUser} />
	},
}

interface TlaPublishEditorProps {
	schema: SerializedSchema
	records: TLRecord[]
}

export function TlaPublishEditor({ schema, records }: TlaPublishEditorProps) {
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
		<div className={styles.editor} data-testid="tla-editor">
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
