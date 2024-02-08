import { TLUiMenuGroup, TLUiOverrides, menuItem, toolbarItem } from '@tldraw/tldraw'

// There's a guide at the bottom of this file!

export const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
		tools.card = {
			id: 'card',
			icon: 'color',
			label: 'Card',
			kbd: 'c',
			readonlyOk: false,
			onSelect: () => {
				editor.setCurrentTool('card')
			},
		}
		return tools
	},
	toolbar(_app, toolbar, { tools }) {
		// Add the tool item from the context to the toolbar.
		toolbar.splice(4, 0, toolbarItem(tools.card))
		return toolbar
	},
	keyboardShortcutsMenu(_app, keyboardShortcutsMenu, { tools }) {
		// Add the tool item from the context to the keyboard shortcuts dialog.
		const toolsGroup = keyboardShortcutsMenu.find(
			(group) => group.id === 'shortcuts-dialog.tools'
		) as TLUiMenuGroup
		toolsGroup.children.push(menuItem(tools.card))
		return keyboardShortcutsMenu
	},
}

/* 

This file contains overrides for the Tldraw UI. These overrides are used to add your custom tools
to the toolbar and the keyboard shortcuts menu.

We do this by providing a custom toolbar override to the Tldraw component. This override is a 
function that takes the current editor, the default toolbar items, and the default tools. 
It returns the new toolbar items. We use the toolbarItem helper to create a new toolbar item
for our custom tool. We then splice it into the toolbar items array at the 4th index. This puts 
it after the eraser tool. We'll pass our overrides object into the Tldraw component's `overrides` 
prop.


*/
