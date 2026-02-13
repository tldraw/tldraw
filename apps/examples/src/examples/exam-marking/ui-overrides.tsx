import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TldrawUiMenuItem,
	TLUiOverrides,
	useIsToolSelected,
	useTools,
} from 'tldraw'

// There's a guide at the bottom of this file!

// [1]
export const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
		tools.mark = {
			id: 'mark',
			icon: <span style={{ fontSize: '2em' }}>📝</span>,
			label: 'Mark Exam',
			kbd: 'm',
			onSelect: () => {
				editor.setCurrentTool('mark')
			},
		}
		return tools
	},
}

// [2]
export const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isMarkingToolSelected = useIsToolSelected(tools['mark'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['mark']} isSelected={isMarkingToolSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuItem {...tools['mark']} />
				<DefaultKeyboardShortcutsDialogContent />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

/* 

This file contains overrides for the Tldraw UI. These overrides are used to add your custom tools to
the toolbar and the keyboard shortcuts menu.

[1]
First we have to add our new tool to the tools object in the tools override. This is where we define
all the basic information about our new tool - its icon, label, keyboard shortcut, what happens when
we select it, etc.

[2]
Then, we replace the UI components for the toolbar and keyboard shortcut dialog with our own, that
add our new tool to the existing default content. Ideally, we'd interleave our new tool into the
ideal place among the default tools, but for now we're just adding it at the start to keep things
simple.
*/
