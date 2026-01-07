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

// UI overrides to add the spectrogram frame tool to the toolbar
export const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools['spectrogram-frame'] = {
			id: 'spectrogram-frame',
			icon: 'color',
			label: 'Spectrogram frame',
			kbd: 'g',
			onSelect: () => {
				editor.setCurrentTool('spectrogram-frame')
			},
		}
		return tools
	},
}

// Component overrides to include the tool in toolbar and keyboard shortcuts
export const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isSelected = useIsToolSelected(tools['spectrogram-frame'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['spectrogram-frame']} isSelected={isSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuItem {...tools['spectrogram-frame']} />
				<DefaultKeyboardShortcutsDialogContent />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}
