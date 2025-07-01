import { TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { ToolbarTopPanel } from './ToolbarTopPanel'

// There's a guide at the bottom of this file!

const components: TLComponents = {
	// [1]
	Toolbar: null,
	// [2]
	TopPanel: ToolbarTopPanel,
}

// [3]
export default function ToolbarInTopPanelExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
This example shows how to move the toolbar from its default position (left side) to the top panel.

[1]
We hide the default toolbar by setting it to null.

[2]
We replace the default TopPanel with our custom ToolbarTopPanel component that contains the DefaultToolbar.

[3]
The main component renders the Tldraw editor with our custom components.

The key insight here is that instead of rebuilding the toolbar from scratch, we simply reuse the
existing DefaultToolbar component in a different location. This preserves all the toolbar's 
functionality while just changing its position.

We also apply custom CSS to:
- Add padding so the toolbar doesn't touch the screen edge
- Move the tool lock button to the right side to prevent vertical shifting
- Rotate the overflow menu chevron to point downward (appropriate for top placement)
*/
