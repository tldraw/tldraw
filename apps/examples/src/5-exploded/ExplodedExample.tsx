import {
	InstanceRecordType,
	TldrawCanvas,
	TldrawContextMenu,
	TldrawEditor,
	TldrawUi,
	createDefaultTldrawEditorSchema,
	createDefaultTldrawEditorStore,
	defaultTldrawEditorMigrators,
	defaultTldrawEditorShapeUtils,
	defaultTldrawEditorTools,
	defaultTldrawEditorValidator,
	useLocalSyncClient,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

const instanceId = InstanceRecordType.createCustomId('example')

const schema = createDefaultTldrawEditorSchema()
const store = createDefaultTldrawEditorStore({ schema, instanceId })

export default function Example() {
	const syncedStore = useLocalSyncClient({
		store,
		instanceId,
		universalPersistenceKey: 'exploded-example',
	})

	return (
		<div className="tldraw__editor">
			<TldrawEditor
				syncedStore={syncedStore}
				shapes={defaultTldrawEditorShapeUtils}
				tools={defaultTldrawEditorTools}
				validator={defaultTldrawEditorValidator}
				migrators={defaultTldrawEditorMigrators}
				autoFocus
			>
				<TldrawUi>
					<TldrawContextMenu>
						<TldrawCanvas />
					</TldrawContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}
