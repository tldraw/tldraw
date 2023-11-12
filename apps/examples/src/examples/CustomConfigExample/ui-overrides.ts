import { TLUiMenuGroup, TLUiOverrides, menuItem, toolbarItem } from '@tldraw/tldraw'

// In order to see select our custom shape tool, we need to add it to the ui.

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
