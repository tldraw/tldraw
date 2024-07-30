import {
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TLUiOverrides,
	TldrawUiMenuItem,
} from 'tldraw'

export const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
		tools.counter = {
			id: 'counter',
			icon: <>🎲</>,
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
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem tool="counter" />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}
