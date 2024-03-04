import { DefaultToolbar, DefaultToolbarContent, TLComponents, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

function CustomToolbar() {
	const editor = useEditor()
	return (
		<div style={{ transform: 'rotate(180deg)' }}>
			<DefaultToolbar>
				<button
					onClick={() => {
						editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
					}}
					title="delete all"
				>
					🧨
				</button>
				<DefaultToolbarContent />
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
