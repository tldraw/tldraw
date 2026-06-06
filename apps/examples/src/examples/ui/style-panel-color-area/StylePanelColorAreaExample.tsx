import { useState } from 'react'
import {
	DefaultStylePanel,
	DefaultStylePanelContent,
	Tldraw,
	TLComponents,
	TLUiStylePanelProps,
} from 'tldraw'
import 'tldraw/tldraw.css'

// The color area at the top of the style panel can either fit its content
// (`'auto'`) or be capped at a fixed pixel height. When capped, it scrolls if
// the content overflows and gains a drag handle so end users can resize it.
const CAPPED_HEIGHT = 120

export default function StylePanelColorAreaExample() {
	const [capped, setCapped] = useState(true)

	// Override the style panel content to pass our chosen color area height. The
	// `colorAreaHeight` prop overrides the `stylePanelColorAreaHeight` editor option
	// per instance, so we can toggle it live without recreating the editor.
	const components: TLComponents = {
		StylePanel: (props: TLUiStylePanelProps) => (
			<DefaultStylePanel {...props}>
				<DefaultStylePanelContent colorAreaHeight={capped ? CAPPED_HEIGHT : 'auto'} />
			</DefaultStylePanel>
		),
	}

	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
			<div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1000 }}>
				<button onClick={() => setCapped((c) => !c)}>
					Color area height: {capped ? `${CAPPED_HEIGHT}px` : 'auto'}
				</button>
			</div>
		</div>
	)
}
