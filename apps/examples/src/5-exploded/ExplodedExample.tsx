import {
	Canvas,
	ContextMenu,
	TldrawEditor,
	TldrawUi,
	createTldrawEditorStore,
	defaultShapes,
	defaultTools,
	useLocalSyncClient,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

const store = createTldrawEditorStore({
	shapes: defaultShapes,
})

export default function Example() {
	const syncedStore = useLocalSyncClient({
		store,
		universalPersistenceKey: 'exploded-example',
	})

	return (
		<div className="tldraw__editor">
			<TldrawEditor syncedStore={syncedStore} shapes={defaultShapes} tools={defaultTools} autoFocus>
				<TldrawUi>
					<ContextMenu>
						<Canvas />
					</ContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}
