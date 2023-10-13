import {
	Canvas,
	ContextMenu,
	TldrawEditor,
	TldrawUi,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function ExplodedExample() {
	return (
		<div className="tldraw__editor">
			<TldrawEditor
				initialState="select"
				shapeUtils={defaultShapeUtils}
				tools={[...defaultTools, ...defaultShapeTools]}
				persistenceKey="exploded-example"
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
