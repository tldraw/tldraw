import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	TLComponents,
	TLUiOverrides,
	TldrawUiMenuItem,
	toolbarItem,
	useTools,
} from 'tldraw'

// There's a guide at the bottom of this file!

export const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.card = {
			id: 'card',
			icon: 'color',
			label: 'Card' as any,
			kbd: 'c',
			onSelect: () => {
				editor.setCurrentTool('card')
			},
		}
		return tools
	},
	toolbar(_app, toolbar, { tools }) {
		toolbar.splice(4, 0, toolbarItem(tools.card))
		return toolbar
	},
}

export const components: TLComponents = {
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()

		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<DefaultKeyboardShortcutsDialogContent />
				{/* Ideally, we'd interleave this into the tools section */}
				<TldrawUiMenuItem {...tools['card']} />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

/* 
Here we add our custom tool to the toolbar. We do this by providing a custom
toolbar override to the Tldraw component. This override is a function that takes
the current editor, the default toolbar items, and the default tools. It returns
the new toolbar items. We use the toolbarItem helper to create a new toolbar item
for our custom tool. We then splice it into the toolbar items array at the 4th index.
This puts it after the eraser tool. We'll pass our overrides object into the 
Tldraw component's `overrides` prop.

For this example the icon we use is the same as the color icon. For an example
of how to add a custom icon, see the screenshot or speech-bubble examples.

*/
