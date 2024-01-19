import { SerializedSchema, TLRecord, Tldraw } from '@tldraw/tldraw'
import { UrlStateSync } from '../components/MultiplayerEditor'
import { StoreErrorScreen } from '../components/StoreErrorScreen'
import { useLocalStore } from '../hooks/useLocalStore'
import { assetUrls } from '../utils/assetUrls'
import { linksUiOverrides } from '../utils/links'
import { DebugMenuItems } from '../utils/migration/DebugMenuItems'
import { useSharing } from '../utils/sharing'
import { useFileSystem } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'
import { ExportMenu } from './ExportMenu'

type SnapshotEditorProps = {
	schema: SerializedSchema
	records: TLRecord[]
}

export function SnapshotsEditor(props: SnapshotEditorProps) {
	const handleUiEvent = useHandleUiEvents()
	const sharingUiOverrides = useSharing({ isMultiplayer: true })
	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: true })
	const storeResult = useLocalStore(props.records, props.schema)
	if (!storeResult?.ok) return <StoreErrorScreen error={new Error(storeResult?.error)} />

	return (
		<div className="tldraw__editor">
			<Tldraw
				assetUrls={assetUrls}
				store={storeResult.value}
				overrides={[sharingUiOverrides, fileSystemUiOverrides, linksUiOverrides]}
				onUiEvent={handleUiEvent}
				onMount={(editor) => {
					editor.updateInstanceState({ isReadonly: true })
				}}
				components={{
					ErrorFallback: ({ error }) => {
						throw error
					},
				}}
				shareZone={
					<div className="tlui-share-zone" draggable={false}>
						<ExportMenu />
					</div>
				}
				renderDebugMenuItems={() => <DebugMenuItems />}
				autoFocus
				inferDarkMode
			>
				<UrlStateSync />
			</Tldraw>
		</div>
	)
}
