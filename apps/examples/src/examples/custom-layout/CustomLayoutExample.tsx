import {
	DefaultNavigationPanel,
	DefaultStylePanel,
	DefaultToolbar,
	TLComponents,
	Tldraw,
} from 'tldraw'
import 'tldraw/tldraw.css'

const components: TLComponents = {
	// Move the toolbar from bottom-center to top-center
	TopCenterPanel: DefaultToolbar,
	BottomCenterPanel: null,
	// Move the navigation panel from bottom-left to bottom-right
	BottomRightPanel: DefaultNavigationPanel,
	// Move the style panel from top-right to bottom-left:
	BottomLeftPanel: DefaultStylePanel,
	TopRightPanel: null,
}

export default function Example() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
