import { Tldraw, TLUiActionItem, TLUiActionsContextType, TLUiOverrides } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const overrides: TLUiOverrides = {
	actions(_editor, actions, helpers) {
		const myCustomAction: TLUiActionItem = {
			id: 'my-action',
			label: 'My action',
			icon: 'circle',
			// [2]
			kbd: 's',
			onSelect(source) {
				// [3]
				helpers.addToast({ title: `My action was selected from ${source}!` })
			},
		}

		// [4]
		const newActions: TLUiActionsContextType = {
			...actions,
			'my-action': myCustomAction,
			delete: {
				...actions['delete'],
				kbd: 'shift+x',
			},
		}

		return newActions
	},
}

export default function ActionOverridesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overrides={overrides} />
		</div>
	)
}

/*
Tldraw's actions can be fired via keyboard shortcuts, or from anywhere in the user interface via
the `useActions` hook. This example shows how to override tldraw's actions object via the Tldraw
component's `overrides` prop. To learn more about surfacing actions in a customized menu, see the
custom menus example.

[1]
Define the overrides outside of the component (or memoize them) so the object is stable across
renders. The `actions` override receives the editor, the default actions, and a set of UI helpers,
and returns the actions object to use.

[2]
Keyboard shortcuts use the same syntax as tldraw's built-in actions, e.g. `'s'` or `'shift+x'`.
For more information on keyboard shortcuts see the keyboard shortcuts example.

[3]
UI helpers like `addToast`, `removeToast`, and `addDialog` are available on the helpers object.

[4]
Return a new object with the new action added. You can also modify existing actions, as shown here
by changing the delete action's shortcut.
*/
