import { Tldraw, TLUiActionItem, TLUiActionsContextType } from 'tldraw'
import 'tldraw/tldraw.css'

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				overrides={{
					actions: (_editor, actions, helpers) => {
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
				}}
			/>
		</div>
	)
}

/* 
Tldraw's actions can be fired via keyboard shortcuts, or from anywhere in the user interface via 
the `useActions` hook. This example shows how you can override tldraw's actions object via the Tldraw
component's `overrides` prop. To learn more about using this actions via a customized menu, see the 
custom actions menu example.

[2]
For more information on keyboard shortcuts see the keyboard shortcuts example.

[3]
You can access UI helpers like addToast, removeToast, etc. from the helpers object.

[4]
Return a new object with the new actions added. You can also modify existing actions as shown here with the delete action.
*/
