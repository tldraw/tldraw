import { useMemo, useState } from 'react'
import {
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	StateNode,
	TLComponents,
	TLTextShape,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	Tldraw,
	TldrawUiButton,
	TldrawUiMenuItem,
	toRichText,
	useIsToolSelected,
	useTools,
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
const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
		tools.heart = {
			id: 'heart',
			icon: 'heart-icon',
			label: 'Heart',
			kbd: 'r',
			onSelect: () => {
				editor.setCurrentTool('heart')
			},
		}
		return tools
	},
}

// [3]
export const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'heart-icon': '/heart-icon.svg',
	},
}

// [4]
export default function DynamicToolsExample() {
	const [editor, setEditor] = useState<Editor | null>(null)
	const [isHeartToolEnabled, setIsHeartToolEnabled] = useState(false)

	// [5]
	const components: TLComponents = useMemo(
		() => ({
			Toolbar: (props) => {
				const tools = useTools()
				const isHeartSelected = useIsToolSelected(tools['heart'])

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
				const toggleHeartTool = () => {
					if (!editor) return
					if (isHeartToolEnabled) {
						// [6]
						editor.removeTool(HeartTool)
						// Switch to select tool if we're currently on the heart tool
						if (editor.getCurrentToolId() === 'heart') {
							editor.setCurrentTool('select')
						}
					} else {
						// [7]
						editor.setTool(HeartTool)
					}
					setIsHeartToolEnabled(!isHeartToolEnabled)
				}

				return (
					<div className="toggle-button-container">
						<TldrawUiButton onClick={toggleHeartTool} type="normal">
							{isHeartToolEnabled ? '💔 Remove Heart Tool' : '💖 Add Heart Tool'}
						</TldrawUiButton>
					</div>
				)
			},
		}),
		[editor, isHeartToolEnabled]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				overrides={uiOverrides}
				components={components}
				onMount={(editor) => setEditor(editor)}
				// pass in our custom asset urls
				assetUrls={customAssetUrls}
			/>
		</div>
	)
}

/*
Introduction:

This example demonstrates how to use the `setTool` and `removeTool` methods to dynamically
add and remove tools from the editor's state chart after initialization. When the tool is
added, it also appears in the toolbar dynamically. This is useful when you need to 
conditionally enable or disable tools based on runtime conditions like user permissions, 
feature flags, or application state.

[1]
We define a simple HeartTool that extends StateNode. It creates a heart emoji sticker 
when you click on the canvas. This tool is NOT passed to the Tldraw component initially - 
it will be added dynamically using setTool.

[2]
We define UI overrides to add the heart tool to the UI context. This makes it available
for the toolbar component to reference, even if the tool hasn't been added to the state
chart yet.

[3]
We override the Toolbar component to conditionally show the heart tool. The tool only
appears in the toolbar when it exists in the state chart (isHeartToolEnabled is true).
This creates a nice dynamic behavior where the toolbar updates when you add/remove the tool.

[4]
We pass the overrides and components to the Tldraw component. The toggle button will
appear on top of the canvas, and clicking it will add/remove the heart tool dynamically.
When added, the tool appears in the toolbar and can be used immediately.

[5]
We define the components object. We override the Toolbar component to conditionally show the heart tool. The tool only
appears in the toolbar when it exists in the state chart (isHeartToolEnabled is true).
This creates a nice dynamic behavior where the toolbar updates when you add/remove the tool.

[6]
We remove the heart tool from the state chart if it exists, and adds it back if it doesn't.

[7]
We add the heart tool to the state chart if it doesn't exist.

*/
