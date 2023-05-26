import {
	DEFAULT_SHAPE_UTILS,
	DEFAULT_TOOLS,
	InstanceRecordType,
	TldrawCanvas,
	TldrawContextMenu,
	TldrawEditor,
	TldrawUi,
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
				<TldrawUi>
					<TldrawContextMenu>
						<TldrawCanvas />
					</TldrawContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}
