import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				overrides={{
					actions: (_editor, actions, _helpers) => {
						const newActions = {
							...actions,
							delete: { ...actions['delete'], kbd: 'x' },
						}
						return newActions
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
