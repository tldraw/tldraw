import {
	DEFAULT_SHAPE_UTILS,
	DEFAULT_TOOLS,
	InstanceRecordType,
	TldrawEditor,
	TldrawEditorCanvas,
	TldrawEditorUi,
	TldrawEditorUiContextMenu,
	createDefaultTldrawEditorStore,
	useLocalSyncClient,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

const instanceId = InstanceRecordType.createCustomId('example')

const store = createDefaultTldrawEditorStore()

export default function Example() {
	const syncedStore = useLocalSyncClient({
		store,
		instanceId,
		universalPersistenceKey: 'exploded-example',
	})

	return (
		<div className="tldraw__editor">
			<TldrawEditor
				instanceId={instanceId}
				store={syncedStore}
				shapes={DEFAULT_SHAPE_UTILS}
				tools={DEFAULT_TOOLS}
				autoFocus
			>
				<TldrawEditorUi>
					<TldrawEditorUiContextMenu>
						<TldrawEditorCanvas />
					</TldrawEditorUiContextMenu>
				</TldrawEditorUi>
			</TldrawEditor>
		</div>
	)
}
