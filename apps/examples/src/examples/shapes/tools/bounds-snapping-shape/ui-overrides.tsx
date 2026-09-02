import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TLUiOverrides,
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
} from 'tldraw'

export const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
		tools.PlayingCard = {
			id: 'PlayingCard',
			icon: <span style={{ fontSize: '2em' }}>🃏</span>,
			label: 'Playing card',
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
		const isCardSelected = useIsToolSelected(tools['PlayingCard'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['PlayingCard']} isSelected={isCardSelected} />
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

// Same pattern as the custom-config example's ui-overrides.tsx; see the guide there.
