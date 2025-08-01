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
