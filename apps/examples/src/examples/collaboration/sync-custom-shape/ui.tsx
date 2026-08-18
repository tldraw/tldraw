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
		tools.counter = {
			id: 'counter',
			icon: 'color',
			label: 'Counter',
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
