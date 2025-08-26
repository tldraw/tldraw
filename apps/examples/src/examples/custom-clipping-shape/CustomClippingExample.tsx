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

const shapeUtils = [CircleClipShapeUtil]
const tools = [CircleClipShapeTool]

// Add the circle clip tool to the UI
const customUiOverrides: TLUiOverrides = {
	tools: (editor: any, tools: any) => {
		return {
			...tools,
			'circle-clip': {
				id: 'circle-clip',
				label: 'Circle Clip',
				icon: 'geo-circle',
				kbd: 'c',
				onSelect() {
					editor.setCurrentTool('circle-clip')
				},
			},
		}
	},
}

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
			>
				{clippingEnabled ? '✂️ Disable Clipping' : '○ Enable Clipping'}
			</button>
		</div>
	)
}

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

const components: TLComponents = {
	Toolbar: CustomToolbar,
	InFrontOfTheCanvas: ToggleClippingButton,
}

export default function CustomClippingExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				tools={tools}
				components={components}
				overrides={customUiOverrides}
				onMount={(editor) => {
					// Set default tool
					editor.setCurrentTool('select')

					// Create initial demo content with clipping
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

					// Add content that will be clipped
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

					// Zoom to fit the content
					editor.zoomToFit()
				}}
			/>
		</div>
	)
}
