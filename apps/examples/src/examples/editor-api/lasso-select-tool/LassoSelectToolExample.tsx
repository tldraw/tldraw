import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuItem,
	TLUiOverrides,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import { LassoOverlayUtil } from './LassoOverlayUtil'
import { LassoSelectTool } from './LassoSelectTool'
// There's a guide at the bottom of this file!

//[1]
const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools['lasso-select'] = {
			id: 'lasso-select',
			icon: 'color',
			label: 'Lasso Select',
			kbd: 'w', //w for wrangle 🤠
			onSelect: () => {
				editor.setCurrentTool('lasso-select')
			},
		}
		return tools
	},
}

//[2]
const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isLassoSelected = useIsToolSelected(tools['lasso-select'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['lasso-select']} isSelected={isLassoSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<DefaultKeyboardShortcutsDialogContent />
				<TldrawUiMenuItem {...tools['lasso-select']} />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

//[3]
const overlayUtils = [LassoOverlayUtil]

export default function LassoSelectToolExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={[LassoSelectTool]}
				overrides={uiOverrides}
				components={components}
				overlayUtils={overlayUtils}
				persistenceKey="lasso-select-example"
			/>
		</div>
	)
}

/*
This example shows how to build a lasso select tool using the StateNode and EditorAtom classes. For a simpler example of how to build a selection tool, see the `MiniSelectTool` in the only-editor example. If you want to see an even simpler select tool that doesn't implement any child states, see the `MicroSelectTool` in the same example.

[1]
Here are the UI overrides for the lasso select tool, which we'll pass into the <Tldraw> component. It adds a new tool to the toolbar and keyboard shortcuts dialog, as well as sets the keyboard shortcut. More info about this in the 'add-tool-to-toolbar' and 'custom-config' examples.

[2]
This is the set of custom components for the lasso select tool, which we'll also pass into the <Tldraw> component. It adds a new toolbar and keyboard shortcuts dialog. More info  about this in the 'add-tool-to-toolbar' and 'custom-config' examples.

[3]
The LassoOverlayUtil is a custom OverlayUtil that renders the lasso directly onto the canvas overlay. It reads the lasso points from the tool's state atom, smooths them using `getStrokePoints`, converts to an SVG path string, and renders via Canvas 2D Path2D. See LassoOverlayUtil.ts for the implementation.

*/
