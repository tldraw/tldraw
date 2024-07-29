import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				overrides={{
					actions: (_editor, actions, _helpers) => {
						// change the keyboard shortcut for delete from backspace to x
						actions.delete = { ...actions.delete!, kbd: 'x' }

						// remove the duplicate action entirely. this also removes it from the UI.
						delete actions.duplicate

						return actions
					},
				}}
			/>
		</div>
	)
}

/* 
This example shows how you can override tldraw's actions object to change the keyboard shortcuts.
In this case we're changing the delete action's shortcut to 'x'. To customize the actions menu
please see the custom actions menu example. For more information on keyboard shortcuts see the
keyboard shortcuts example.
*/
