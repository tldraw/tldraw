import {
	Canvas,
	ContextMenu,
	getUserData,
	InstanceRecordType,
	TldrawEditor,
	TldrawEditorConfig,
	TldrawUi,
	useLocalSyncClient,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

const instanceId = InstanceRecordType.createCustomId('example')

const config = new TldrawEditorConfig()

export default function Example() {
	const userData = getUserData()

	const syncedStore = useLocalSyncClient({
		config,
		instanceId,
		userId: userData.id,
		universalPersistenceKey: 'exploded-example',
		// config: myConfig // for custom config, see 3-custom-config
	})

	return (
		<div className="tldraw__editor">
			<TldrawEditor
				instanceId={instanceId}
				userId={userData.id}
				store={syncedStore}
				config={config}
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
