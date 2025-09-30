import {
	createShapeId,
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuItem,
	TLGeoShapeProps,
	TLTextShapeProps,
	TLUiOverrides,
	toRichText,
	useEditor,
	useIsToolSelected,
	useTools,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { CircleClipShapeTool } from './CircleClipShapeTool'
import { CircleClipShape, CircleClipShapeUtil, isClippingEnabled$ } from './CircleClipShapeUtil'
import './CustomClipping.css'

// There's a guide at the bottom of this file!

// [1]
const shapeUtils = [CircleClipShapeUtil]
const tools = [CircleClipShapeTool]

// [2]
const customUiOverrides: TLUiOverrides = {
	tools: (editor: any, tools: any) => {
		return {
			...tools,
			'circle-clip': {
				id: 'circle-clip',
				label: 'Circle Clip',
				icon: 'color',
				kbd: 'c',
				onSelect() {
					editor.setCurrentTool('circle-clip')
				},
			},
		}
	},
}

// [3]
function ToggleClippingButton() {
	const editor = useEditor()

	const clippingEnabled = useValue('isClippingEnabled', () => isClippingEnabled$.get(), [editor])

	return (
		<div className="CustomClipping-toggleButton">
			<button
				className={`CustomClipping-button ${
					clippingEnabled ? 'CustomClipping-button--enabled' : 'CustomClipping-button--disabled'
				}`}
				onClick={() => {
					isClippingEnabled$.update((prev) => !prev)
				}}
				onPointerDown={editor.markEventAsHandled}
				onPointerUp={editor.markEventAsHandled}
			>
				{clippingEnabled ? '✂️ Disable Clipping' : '○ Enable Clipping'}
			</button>
		</div>
	)
}

// [4]
function CustomToolbar() {
	const tools = useTools()
	const isCircleClipSelected = useIsToolSelected(tools['circle-clip'])

	return (
		<DefaultToolbar>
			<TldrawUiMenuItem {...tools['circle-clip']} isSelected={isCircleClipSelected} />
			<DefaultToolbarContent />
		</DefaultToolbar>
	)
}

// [5]
const components: TLComponents = {
	Toolbar: CustomToolbar,
	InFrontOfTheCanvas: ToggleClippingButton,
}

// [6]
export default function CustomClippingExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				tools={tools}
				components={components}
				overrides={customUiOverrides}
				onMount={(editor) => {
					editor.setCurrentTool('select')

					const clipShapeId = createShapeId()
					editor.createShape<CircleClipShape>({
						id: clipShapeId,
						type: 'circle-clip',
						x: 200,
						y: 200,
						props: {
							w: 300,
							h: 300,
						},
					})

					editor.createShape({
						type: 'text',
						x: 0,
						y: 100,
						parentId: clipShapeId,
						props: {
							size: 'l',
							textAlign: 'middle',
							richText: toRichText('This text is clipped to the circle! ✂️'),
						} satisfies Partial<TLTextShapeProps>,
					})

					editor.createShape({
						type: 'geo',
						x: 100,
						y: 290,
						parentId: clipShapeId,
						props: {
							geo: 'rectangle',
							w: 200,
							h: 100,
							fill: 'solid',
							color: 'blue',
							richText: toRichText('Oops you found me!'),
						} satisfies Partial<TLGeoShapeProps>,
					})

					editor.zoomToFit()
				}}
			/>
		</div>
	)
}

/*
Introduction:

This example demonstrates the extensible clipping system in tldraw, showing how to create custom shapes 
that can clip their children with any polygon geometry. The clipping system uses two key methods: 
`getClipPath` to define the clip boundary and `shouldClipChild` to control which children get clipped.

[1] 
We define arrays to hold our custom shape util and tool. It's important to do this outside of any React 
component so that these arrays don't get redefined on every render.

[2]
Here we define UI overrides to add our custom circle clip tool to the toolbar. The `tools` override 
allows us to add new tools with custom icons, labels, and keyboard shortcuts.

[3]
The ToggleClippingButton component demonstrates how to create global state management for clipping. 
It uses the `isClippingEnabled$` atom to toggle clipping on/off for all circle clip shapes.

[4]
The CustomToolbar component shows how to integrate custom tools into the main toolbar. We use 
`useIsToolSelected` to highlight the active tool and `TldrawUiMenuItem` to render the tool button.

[5]
We define custom components to override the default toolbar and add our toggle button in front of 
the canvas. The `components` prop allows us to customize various parts of the tldraw UI.

[6]
This is where we render the Tldraw component with our custom shape utils, tools, components, and 
overrides. The onMount callback sets up the initial demo content.

For more details on the clipping implementation, see CircleClipShapeUtil.tsx and CircleClipShapeTool.tsx.

*/
