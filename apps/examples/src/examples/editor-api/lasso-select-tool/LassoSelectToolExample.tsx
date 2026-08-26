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
			label: 'Lasso select',
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
The tool itself lives in LassoSelectTool.ts and the overlay in LassoOverlayUtil.ts. For a simpler
selection tool, see the `MiniSelectTool` and `MicroSelectTool` in the only-editor example.

[1]
The UI override registers the tool with the UI so it has an icon, label, and keyboard shortcut. See
the add-tool-to-toolbar example for more on this.

[2]
The `components` override adds the tool to the toolbar and the keyboard shortcuts dialog. These are
defined at module level so `<Tldraw>` doesn't see a new object on every render.

[3]
`LassoOverlayUtil` draws the lasso onto the canvas overlay. It reads the tool's `points` atom, smooths
the points with `getStrokePoints`, converts them to an SVG path, and paints it with a `Path2D`.
*/
