import {
	Button,
	DefaultColorStyle,
	DefaultStylePanel,
	DefaultStylePanelContent,
	TLComponents,
	TLUiStylePanelProps,
	Tldraw,
	useEditor,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomStylePanel(props: TLUiStylePanelProps) {
	const editor = useEditor()

	// Styles are complex, sorry. Check our DefaultStylePanel for an example.

	return (
		<DefaultStylePanel {...props}>
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
			<DefaultStylePanelContent relevantStyles={props.relevantStyles} />
		</DefaultStylePanel>
	)
}

const components: TLComponents = {
	StylePanel: CustomStylePanel, // null will hide the panel instead
}

export default function CustomStylePanelExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
