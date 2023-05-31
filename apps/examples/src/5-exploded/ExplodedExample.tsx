import { Canvas, ContextMenu, TldrawEditor, TldrawUi } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

export default function ExplodedExample() {
	return (
		<div className="tldraw__editor">
			<TldrawEditor autoFocus persistenceKey="exploded-example">
				<TldrawUi>
					<ContextMenu>
						<Canvas />
					</ContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}
