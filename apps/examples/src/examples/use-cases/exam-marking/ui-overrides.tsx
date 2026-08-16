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

// [1]
export const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.mark = {
			id: 'mark',
			icon: <span style={{ fontSize: '2em' }}>📝</span>,
			label: 'Mark exam',
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
[1]
The `tools` override registers the tool item in the UI: its icon, label, keyboard shortcut,
and what selecting it does. Registering it here is what makes `useTools()` return it below.

[2]
The toolbar and keyboard shortcuts dialog don't pick up new tools automatically, so we
replace both with versions that render our item ahead of the default content.
*/
