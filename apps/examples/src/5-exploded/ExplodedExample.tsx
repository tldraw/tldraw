import {
	Canvas,
	ContextMenu,
	createDefaultTldrawEditorStore,
	DEFAULT_SHAPE_UTILS,
	DEFAULT_TOOLS,
	getUserData,
	InstanceRecordType,
	TldrawEditor,
	TldrawUi,
	useLocalSyncClient,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

const instanceId = InstanceRecordType.createCustomId('example')

const store = createDefaultTldrawEditorStore()

export default function Example() {
	const userData = getUserData()

	const syncedStore = useLocalSyncClient({
		store,
		instanceId,
		userId: userData.id,
		universalPersistenceKey: 'exploded-example',
	})

	return (
		<div className="tldraw__editor">
			<TldrawEditor
				instanceId={instanceId}
				userId={userData.id}
				store={syncedStore}
				shapes={DEFAULT_SHAPE_UTILS}
				tools={DEFAULT_TOOLS}
				autoFocus
			>
				<TldrawUi>
					<ContextMenu>
						<Canvas />
					</ContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}
