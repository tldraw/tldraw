import {
	atom,
	DefaultToolbar,
	DefaultToolbarContent,
	StateNode,
	TLComponents,
	TLTextShape,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	Tldraw,
	TldrawUiButton,
	TldrawUiMenuItem,
	toRichText,
	useEditor,
	useIsToolSelected,
	useTools,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './dynamic-tools.css'

// There's a guide at the bottom of this file!

const OFFSET = 12

// [1]
class HeartTool extends StateNode {
	static override id = 'heart'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
		this.editor.createShape<TLTextShape>({
			type: 'text',
			x: currentPagePoint.x - OFFSET,
			y: currentPagePoint.y - OFFSET,
			props: { richText: toRichText('❤️') },
		})
	}
}

// [2]
const isHeartToolEnabled$ = atom('isHeartToolEnabled', false)

// [3]
const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.heart = {
			id: 'heart',
			icon: 'heart-icon',
			label: 'Heart',
			kbd: 'y',
			onSelect: () => {
				// [4]
				if (!isHeartToolEnabled$.get()) return
				editor.setCurrentTool('heart')
			},
		}
		return tools
	},
}

const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'heart-icon': '/heart-icon.svg',
	},
}

// [5]
const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isHeartSelected = useIsToolSelected(tools['heart'])
		const isHeartToolEnabled = useValue(isHeartToolEnabled$)

		return (
			<DefaultToolbar {...props}>
				{isHeartToolEnabled && (
					<TldrawUiMenuItem {...tools['heart']} isSelected={isHeartSelected} />
				)}
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	InFrontOfTheCanvas: () => {
		const editor = useEditor()
		const isHeartToolEnabled = useValue(isHeartToolEnabled$)

		const toggleHeartTool = () => {
			if (isHeartToolEnabled) {
				// [6]
				if (editor.getCurrentToolId() === 'heart') {
					editor.setCurrentTool('select')
				}
				editor.removeTool(HeartTool)
			} else {
				// [7]
				editor.setTool(HeartTool)
			}
			isHeartToolEnabled$.set(!isHeartToolEnabled)
		}

		return (
			<div className="toggle-button-container">
				<TldrawUiButton onClick={toggleHeartTool} type="normal">
					{isHeartToolEnabled ? '💔 Remove heart tool' : '💖 Add heart tool'}
				</TldrawUiButton>
			</div>
		)
	},
}

export default function DynamicToolsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				overrides={uiOverrides}
				components={components}
				assetUrls={customAssetUrls}
				// [8]
				onMount={() => {
					isHeartToolEnabled$.set(false)
				}}
			/>
		</div>
	)
}

/*
`editor.setTool` and `editor.removeTool` add and remove tools from the editor's state chart after
it has been created. Use them when a tool's availability depends on runtime conditions such as
permissions or feature flags.

[1]
A minimal tool that stamps a heart at the pointer. It is deliberately not passed to `<Tldraw>` via
the `tools` prop; it is added later with `setTool`.

[2]
Whether the tool is currently installed. Keeping this in an atom lets the toolbar and the toggle
button share it without lifting state into the example component, which would force the
`components` object to be recreated on every change.

[3]
Register the tool with the UI so the toolbar knows its label, icon, and shortcut. This entry can
exist even while the tool is absent from the state chart; the toolbar below decides whether to
show it. The shortcut is `y` because `r` already belongs to the rectangle tool.

[4]
Keyboard shortcuts are registered from the `tools` override whether or not the toolbar shows the
item, so pressing `y` while the tool is uninstalled would call `setCurrentTool` on a state that
doesn't exist and throw. Guard on the atom instead.

[5]
The toolbar reads the atom with `useValue` and only renders the heart item while the tool exists.
The toggle button lives in `InFrontOfTheCanvas` and gets the editor from `useEditor`.

[6]
Removing a tool does not exit it if it's active, so switch to select first. `removeTool` is a
no-op if the tool isn't in the state chart.

[7]
`setTool` constructs the tool and attaches it to the root state. It throws if a tool with the
same id already exists, so don't call it twice without removing first.

[8]
A fresh editor starts without the tool, so reset the flag in case the example remounts.
*/
