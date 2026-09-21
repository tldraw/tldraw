import {
	createShapeId,
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	Tldraw,
	TldrawUiButton,
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
import { CircleClipShapeUtil, isClippingEnabled$ } from './CircleClipShapeUtil'
import './CustomClipping.css'

// There's a guide at the bottom of this file!

// [1]
const shapeUtils = [CircleClipShapeUtil]
const tools = [CircleClipShapeTool]

// [2]
const customUiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools['circle-clip'] = {
			id: 'circle-clip',
			label: 'Circle clip',
			icon: 'color',
			kbd: 'c',
			onSelect() {
				editor.setCurrentTool('circle-clip')
			},
		}
		return tools
	},
}

// [3]
function ToggleClippingButton() {
	const editor = useEditor()

	const clippingEnabled = useValue(isClippingEnabled$)

	return (
		<div className="tlui-menu CustomClipping-toggle">
			<TldrawUiButton
				type="normal"
				onClick={() => isClippingEnabled$.update((prev) => !prev)}
				onPointerDown={editor.markEventAsHandled}
				onPointerUp={editor.markEventAsHandled}
			>
				{clippingEnabled ? '✂️ Disable clipping' : '○ Enable clipping'}
			</TldrawUiButton>
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
					editor.createShape({
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
Any shape can clip its children by implementing `getClipPath` (the polygon, in local space) and
optionally `shouldClipChild` (which children it applies to). See CircleClipShapeUtil.tsx for the
shape itself; this file wires it into the editor and UI.

[1]
Define the shape util and tool arrays outside the component so they keep the same identity across
renders. A new array on each render would make the editor think its shape utils changed.

[2]
Register the tool with the UI so it has a label, icon, and keyboard shortcut. This is what
`useTools()` returns in the toolbar below.

[3]
The toggle flips a module-level atom that every circle's `shouldClipChild` reads, so one click
changes clipping for all circles. `markEventAsHandled` on pointer down/up stops the canvas from
treating the click as the start of a selection.

[4]
Add the tool to the default toolbar. `useIsToolSelected` highlights it while it's active.

[5]
Override the toolbar and add the toggle button in the `InFrontOfTheCanvas` slot.

[6]
On mount, create a circle with a text shape and a rectangle as children. Both are partly outside
the circle so the clipping is visible right away.
*/
