import {
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
		tools.counter = {
			id: 'counter',
			icon: 'color',
			label: 'counter',
			kbd: 'c',
			onSelect: () => {
				editor.setCurrentTool('counter')
			},
		}
		return tools
	},
}

export const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isCounterSelected = useIsToolSelected(tools['counter'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['counter']} isSelected={isCounterSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}
