import {
	Box,
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	useEditor,
	useIsToolSelected,
	useTools,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { ScreenshotDragging } from './ScreenshotTool/childStates/Dragging'
import { ScreenshotTool } from './ScreenshotTool/ScreenshotTool'

// There's a guide at the bottom of this file!

// [1]
const customTools = [ScreenshotTool]

// [2]
const customUiOverrides: TLUiOverrides = {
	tools: (editor, tools) => {
		return {
			...tools,
			screenshot: {
				id: 'screenshot',
				label: 'Screenshot',
				icon: 'tool-screenshot',
				kbd: 'j',
				onSelect() {
					editor.setCurrentTool('screenshot')
				},
			},
		}
	},
}

function CustomToolbar() {
	const tools = useTools()
	const isScreenshotSelected = useIsToolSelected(tools['screenshot'])
	return (
		<DefaultToolbar>
			<TldrawUiMenuItem {...tools['screenshot']} isSelected={isScreenshotSelected} />
			<DefaultToolbarContent />
		</DefaultToolbar>
	)
}

// [3]
const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'tool-screenshot': '/tool-screenshot.svg',
	},
}

// [4]
function ScreenshotBox() {
	const editor = useEditor()

	const screenshotBrush = useValue(
		'screenshot brush',
		() => {
			if (editor.getPath() !== 'screenshot.dragging') return null

			const draggingState = editor.getStateDescendant<ScreenshotDragging>('screenshot.dragging')!
			const box = draggingState.screenshotBox.get()

			// The box is in page space, but this component sits in front of the canvas in
			// viewport space, so convert it.
			const zoomLevel = editor.getZoomLevel()
			const { x, y } = editor.pageToViewport({ x: box.x, y: box.y })
			return new Box(x, y, box.w * zoomLevel, box.h * zoomLevel)
		},
		[editor]
	)

	if (!screenshotBrush) return null

	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				transform: `translate(${screenshotBrush.x}px, ${screenshotBrush.y}px)`,
				width: screenshotBrush.w,
				height: screenshotBrush.h,
				border: '1px solid var(--tl-color-text-0)',
				zIndex: 999,
			}}
		/>
	)
}

const customComponents: TLComponents = {
	InFrontOfTheCanvas: ScreenshotBox,
	Toolbar: CustomToolbar,
}

// [5]
export default function ScreenshotToolExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="tldraw_screenshot_example"
				tools={customTools}
				overrides={customUiOverrides}
				assetUrls={customAssetUrls}
				components={customComponents}
			/>
		</div>
	)
}

/*
Introduction:

This example shows how to create a custom tool. In tldraw, tools are parts of the
tldraw state chart. While the most common use for tools is creating shapes, you can
use tools to create other types of interactions too! In this example, we create a
"screenshot tool" that lets the user draw a box on the canvas. When the user finishes
drawing their box, we'll export (or copy) a screenshot of that area.

[1]
Our custom tool is a class that extends `StateNode`. See the ScreenshotTool folder for the
tool itself. The array is defined outside of any React component and passed to the Tldraw
component's `tools` prop.

[2]
Register the tool with the UI by adding it to the `tools` object in a `TLUiOverrides`. This
gives the toolbar (and keyboard shortcuts) the tool's label, icon, shortcut, and what to do
when it's selected. The custom toolbar then places the item in front of the default content.

[3]
The toolbar item uses a custom icon, so we map its icon id to a url via `assetUrls.icons`.

[4]
While the tool's dragging state is active we draw the screenshot box in the
`InFrontOfTheCanvas` slot, which renders over the canvas but under menus and the toolbar. The
box lives in an atom on the dragging state node, so reading it inside `useValue` re-renders
this component as the user drags. `editor.getStateDescendant` finds that node by path.

[5]
All of the customizations are defined outside of the React component so they keep the same
identity across renders; new objects each render would make Tldraw re-register them.
*/
