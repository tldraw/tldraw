import {
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuItem,
	useEditor,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

function CustomToolbar() {
	const editor = useEditor()
	const tools = useTools()
	const isScreenshotSelected = useIsToolSelected(tools['rhombus-2'])
	return (
		<div>
			<DefaultToolbar>
				<TldrawUiMenuItem {...tools['rhombus-2']} isSelected={isScreenshotSelected} />

				<DefaultToolbarContent />
				<button
					onClick={() => {
						editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
					}}
					title="delete all"
				>
					🧨
				</button>
			</DefaultToolbar>
		</div>
	)
}

const components: TLComponents = {
	Toolbar: CustomToolbar, // null will hide the panel instead
}

export default function CustomToolbarExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
