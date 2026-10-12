import { TLUiOverrides, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const overrides: TLUiOverrides = {
	tools(_editor, tools) {
		delete tools.text
		return tools
	},
}

export default function RemoveToolExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overrides={overrides} />
		</div>
	)
}

/*
[1]
The `tools` override receives the map of UI tool items and returns the map the
UI should use. Deleting an entry removes the tool from the toolbar, its
keyboard shortcut, and the keyboard shortcuts dialog. The tool itself is still
registered with the editor, so `editor.setCurrentTool('text')` still works.
Define the overrides object outside the component (or memoize it) so the UI
doesn't rebuild on every render.
*/
