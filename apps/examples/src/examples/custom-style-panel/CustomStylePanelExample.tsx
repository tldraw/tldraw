import {
	DefaultColorStyle,
	DefaultStylePanel,
	DefaultStylePanelContent,
	TLComponents,
	TLUiStylePanelProps,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	useEditor,
	useRelevantStyles,
} from 'tldraw'
import 'tldraw/tldraw.css'

function CustomStylePanel(props: TLUiStylePanelProps) {
	const editor = useEditor()

	// Styles are complex, sorry. Check our DefaultStylePanel for an example.

	const styles = useRelevantStyles()

	return (
		<DefaultStylePanel {...props}>
			<TldrawUiButton
				type="menu"
				onClick={() => {
					editor.setStyleForSelectedShapes(DefaultColorStyle, 'red', { squashing: true })
				}}
			>
				<TldrawUiButtonLabel>Red</TldrawUiButtonLabel>
			</TldrawUiButton>
			<TldrawUiButton
				type="menu"
				onClick={() => {
					editor.setStyleForSelectedShapes(DefaultColorStyle, 'green', { squashing: true })
				}}
			>
				<TldrawUiButtonLabel>Green</TldrawUiButtonLabel>
			</TldrawUiButton>
			<DefaultStylePanelContent styles={styles} />
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
