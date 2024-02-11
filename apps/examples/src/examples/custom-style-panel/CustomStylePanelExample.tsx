import { Button, DefaultColorStyle, TLUiComponents, Tldraw, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomStylePanel() {
	const editor = useEditor()

	// Styles are complex, sorry. Check our DefaultStylePanel for an example.

	return (
		<div className="tlui-style-panel__wrapper">
			<Button
				type="menu"
				onClick={() => {
					editor.setStyleForSelectedShapes(DefaultColorStyle, 'red', { squashing: true })
				}}
			>
				Red
			</Button>
			<Button
				type="menu"
				onClick={() => {
					editor.setStyleForSelectedShapes(DefaultColorStyle, 'green', { squashing: true })
				}}
			>
				Green
			</Button>
		</div>
	)
}

const uiComponents: TLUiComponents = {
	StylePanel: CustomStylePanel, // null will hide the panel instead
}

export default function CustomStylePanelExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw uiComponents={uiComponents} />
		</div>
	)
}
