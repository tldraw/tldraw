import {
	Canvas,
	ContextMenu,
	TldrawEditor,
	TldrawEditorConfig,
	TldrawUi,
	TLInstance,
	useLocalSyncClient,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

const instanceId = TLInstance.createCustomId('example')

// for custom config, see 3-custom-config
const config = new TldrawEditorConfig()

export default function Example() {
	const syncedStore = useLocalSyncClient({
		config,
		instanceId,
		universalPersistenceKey: 'exploded-example',
	})

	return (
		<div className="tldraw__editor">
			<TldrawEditor instanceId={instanceId} store={syncedStore} config={config} autoFocus>
				<TldrawUi>
					<ContextMenu>
						<Canvas />
					</ContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}
