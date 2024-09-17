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
import { ScreenshotTool } from './ScreenshotTool/ScreenshotTool'
import { ScreenshotDragging } from './ScreenshotTool/childStates/Dragging'

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
			// Check whether the screenshot tool (and its dragging state) is active
			if (editor.getPath() !== 'screenshot.dragging') return null

			// Get screenshot.dragging state node
			const draggingState = editor.getStateDescendant<ScreenshotDragging>('screenshot.dragging')!

			// Get the box from the screenshot.dragging state node
			const box = draggingState.screenshotBox.get()

			// The box is in "page space", i.e. panned and zoomed with the canvas, but we
			// want to show it in front of the canvas, so we'll need to convert it to
			// "page space", i.e. uneffected by scale, and relative to the tldraw
			// page's top left corner.
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
				border: '1px solid var(--color-text-0)',
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
Our custom tool is a class that extends the StateNode class. See the ScreenshotTool
files for more about the too. We define an array (outside of any React component)
to hold the custom tools. We'll pass this into the Tldraw component's `tools` prop.

[2]
Here we make sure the UI knows about our new tool. We do this by adding it to the
`tools` object, which tells other parts of the UI a tool's label, icon, what should
happen when it's selected, etc. We'll pass our customUiOverrides object into the
Tldraw component's `overrides` prop.

[3]
Our toolbar item is using a custom icon, so we need to provide the asset url for it. 
We do this by providing a custom assetUrls object to the Tldraw component. 
This object is a map of icon ids to their urls. The icon ids are the same as the 
icon prop on the toolbar item. We'll pass our assetUrls object into the Tldraw
component's `assetUrls` prop.

[4]
We want to show a box on the canvas when the screenshot tool is active. We do this
by providing an override to the InFrontOfTheCanvas component. This component will be shown
in front of the canvas but behind any other UI elements, such as menus and the toolbar.
We'll pass our components object into the Tldraw component's `components` prop. 

[5]
Finally we pass all of our customizations into the Tldraw component. It's important
that the customizations are defined outside of the React component, otherwise they
will cause the Tldraw component to see them as new values on every render, which may
produce unexpected results.
*/
