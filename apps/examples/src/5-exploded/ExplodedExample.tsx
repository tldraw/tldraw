import {
	Canvas,
	ContextMenu,
	TldrawEditor,
	TldrawUi,
	createTldrawEditorStore,
	useLocalSyncClient,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

const store = createTldrawEditorStore()

export default function Example() {
	const syncedStore = useLocalSyncClient({
		store,
		universalPersistenceKey: 'exploded-example',
	})

	return (
		<div className="tldraw__editor">
			<TldrawEditor store={syncedStore} autoFocus>
				<TldrawUi>
					<ContextMenu>
						<Canvas />
					</ContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}
