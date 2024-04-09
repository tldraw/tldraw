import { TLUiActionsContextType, TLUiOverrides, TLUiToolsContextType, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const overrides: TLUiOverrides = {
	//[a]
	actions(_editor, actions): TLUiActionsContextType {
		const newActions = {
			...actions,
			'toggle-grid': { ...actions['toggle-grid'], kbd: 'x' },
			'copy-as-png': { ...actions['copy-as-png'], kbd: '$1' },
		}

		return newActions
	},
	//[b]
	tools(_editor, tools): TLUiToolsContextType {
		const newTools = { ...tools, draw: { ...tools.draw, kbd: 'p' } }
		return newTools
	},
}

// [2]
export default function KeyboardShortcuts() {
	return (
		<div className="tldraw__editor">
			<Tldraw overrides={overrides} />
		</div>
	)
}

/* 
This example shows how you can replace tldraw's default keyboard shortcuts with your own,
or add a shortcut for an action that doesn't have one. An example of how to add shortcuts
for custom tools can be found in the custom-config example.

In this case we are overriding the toggle grid and draw tool shortcuts, and creating a 
shortcut for copy-as-png. An override of an existing shortcut will automatically update 
the keyboard shortcuts dialog. However, adding a new shortcut won't, we'll need to add it 
ourselves.

You can describe modifier keys with the following syntax:
	
	shift: !
 ctrl/cmd: $
	  alt: ?

[1]
We start by defining our overrides, this is an object with functions that we can use to 
change the ui. Keyboard shortcuts are associated with either tools (draw, eraser, etc) or 
actions (group, undo/redo etc). We're going to override two actions [a], one tool [b], and 
add a new shortcut to the keyboard shortcuts dialog [c].

[a] actions
	There are two actions we're modifying here, copy-as-png and toggle-grid. copy-as-png
	doesn't have an existing shortcut, but we can still add the property and later add it
	to the keyboard shortcuts dialog [c].

[b] tools
	We're overriding the draw tool's shortcut to 'p', maybe we want to rename it to the pen
	tool or something.

[2]
Finally, we pass our overrides object into the Tldraw component's overrides prop. Now when
the component mounts, our overrides will be applied. If you open the keyboard shortcuts 
dialog, you'll see the changes we made.
*/
