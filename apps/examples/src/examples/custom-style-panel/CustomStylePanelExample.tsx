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
			<div style={{ backgroundColor: 'thistle' }}>
				<TldrawUiButton
					type="menu"
					onClick={() => {
						editor.setStyleForSelectedShapes(DefaultColorStyle, 'red')
					}}
				>
					<TldrawUiButtonLabel>Red</TldrawUiButtonLabel>
				</TldrawUiButton>
			</div>
			<div style={{ backgroundColor: 'thistle' }}>
				<TldrawUiButton
					type="menu"
					onClick={() => {
						editor.setStyleForSelectedShapes(DefaultColorStyle, 'green')
					}}
				>
					<TldrawUiButtonLabel>Green</TldrawUiButtonLabel>
				</TldrawUiButton>
			</div>
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
