import { TLUiOverrides, Tldraw } from 'tldraw'

const overrides: TLUiOverrides = {
	actions(editor, actions) {
		// remote actions - see the action bar
		delete actions.delete
		delete actions.duplicate
		delete actions.undo
		delete actions.redo

		return actions
	},
	tools(editor, tools) {
		// remove tools - see the toolbar
		delete tools.draw
		delete tools.eraser
		delete tools.arrow
		delete tools.text
		delete tools.note
		delete tools.image

		return tools
	},
}

export default function RemoveToolsActionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overrides={overrides} />
		</div>
	)
}
