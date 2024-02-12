import {
	Button,
	DefaultStylePanelContent,
	StylePanelContentProps,
	TLComponents,
	Tldraw,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomStylePanelContent({ relevantStyles }: StylePanelContentProps) {
	// Styles are complex, sorry. Check our DefaultStylePanel for an example.
	return (
		<>
			<DefaultStylePanelContent relevantStyles={relevantStyles} />
			<div className="tlui-style-panel__section">
				<Button type="menu">Click here!</Button>
			</div>
		</>
	)
}

const components: TLComponents = {
	StylePanelContent: CustomStylePanelContent, // null will hide the panel instead
}

export default function CustomStylePanelContentExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
