import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TLUiOverrides,
	TldrawUiMenuItem,
	useTools,
} from 'tldraw'
import { TldrawUiToolbarButton } from 'tldraw/src/lib/ui/components/Toolbar/TldrawUiToolbarButton'

// There's a guide at the bottom of this file!

export const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
		tools.PlayingCard = {
			id: 'PlayingCard',
			icon: 'color',
			label: 'PlayingCard',
			kbd: 'c',
			onSelect: () => {
				editor.setCurrentTool('PlayingCard')
			},
		}
		return tools
	},
}

export const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		return (
			<DefaultToolbar {...props}>
				<TldrawUiToolbarButton {...tools['PlayingCard']} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuItem {...tools['PlayingCard']} />
				<DefaultKeyboardShortcutsDialogContent />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

/* 

This file contains overrides for the Tldraw UI. These overrides are used to add your custom tools to
the toolbar and the keyboard shortcuts menu.

First we have to add our new tool to the tools object in the tools override. This is where we define
all the basic information about our new tool - its icon, label, keyboard shortcut, what happens when
we select it, etc.

Then, we replace the UI components for the toolbar and keyboard shortcut dialog with our own, that
add our new tool to the existing default content. Ideally, we'd interleave our new tool into the
ideal place among the default tools, but for now we're just adding it at the start to keep things
simple.
*/
