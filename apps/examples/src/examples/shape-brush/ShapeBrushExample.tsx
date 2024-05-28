import {
	Mat,
	ShapePropsType,
	StateNode,
	TLBaseShape,
	TLEventHandlers,
	TLInterruptEvent,
	TLShapeId,
	TLTextShape,
	Tldraw,
	Vec,
	VecLike,
	createShapeId,
	getIndexAbove,
	last,
	lineShapeProps,
	sortByIndex,
	structuredClone,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { ShapeLineShapeUtil } from './ShapeLineShapeUtil'

class ShapeLineShapeTool extends StateNode {
	static override id = 'shape-line'
	static override initial = 'idle'
	static override children = () => [ShapeLineIdle, ShapeLinePointing]
}

type ShapeLineShapeProps = ShapePropsType<typeof lineShapeProps>

type ShapeLineShape = TLBaseShape<'shape-line', ShapeLineShapeProps>

const MINIMUM_DISTANCE_BETWEEN_SHIFT_CLICKED_HANDLES = 2

export class ShapeLinePointing extends StateNode {
	static override id = 'pointing'

	shape = {} as ShapeLineShape

	markId: string | undefined

	override onEnter = (info: { shapeId?: TLShapeId }) => {
		const { inputs } = this.editor
		const { currentPagePoint } = inputs

		this.markId = undefined

		// Previously created line shape that we might be extending
		const shape = info.shapeId && this.editor.getShape<ShapeLineShape>(info.shapeId)

		if (shape && inputs.shiftKey) {
			// Extending a previous shape
			this.markId = `creating:${shape.id}`
			this.editor.mark(this.markId)
			this.shape = shape

			const handles = this.editor.getShapeHandles(this.shape)
			if (!handles) return

			const vertexHandles = handles.filter((h) => h.type === 'vertex').sort(sortByIndex)
			const endHandle = vertexHandles[vertexHandles.length - 1]
			const prevEndHandle = vertexHandles[vertexHandles.length - 2]

			const shapePagePoint = Mat.applyToPoint(
				this.editor.getShapeParentTransform(this.shape)!,
				new Vec(this.shape.x, this.shape.y)
			)

			const nextPoint = Vec.Sub(currentPagePoint, shapePagePoint).addXY(0.1, 0.1)
			const points = structuredClone(this.shape.props.points)

			if (
				Vec.DistMin(endHandle, prevEndHandle, MINIMUM_DISTANCE_BETWEEN_SHIFT_CLICKED_HANDLES) ||
				Vec.DistMin(nextPoint, endHandle, MINIMUM_DISTANCE_BETWEEN_SHIFT_CLICKED_HANDLES)
			) {
				// Don't add a new point if the distance between the last two points is too small
				points[endHandle.id] = {
					id: endHandle.id,
					index: endHandle.index,
					x: nextPoint.x,
					y: nextPoint.y,
				}
			} else {
				// Add a new point
				const nextIndex = getIndexAbove(endHandle.index)
				points[nextIndex] = {
					id: nextIndex,
					index: nextIndex,
					x: nextPoint.x,
					y: nextPoint.y,
				}
			}

			this.editor.updateShapes([
				{
					id: this.shape.id,
					type: this.shape.type,
					props: {
						points,
					},
				},
			])
		} else {
			const id = createShapeId()

			this.markId = `creating:${id}`
			this.editor.mark(this.markId)

			this.editor.createShapes<ShapeLineShape>([
				{
					id,
					type: 'shape-line',
					x: currentPagePoint.x,
					y: currentPagePoint.y,
					props: {
						spline: 'cubic',
					},
				},
			])

			this.editor.select(id)
			this.shape = this.editor.getShape(id)!
		}
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (!this.shape) return

		if (this.editor.inputs.isDragging) {
			const handles = this.editor.getShapeHandles(this.shape)
			if (!handles) {
				if (this.markId) this.editor.bailToMark(this.markId)
				throw Error('No handles found')
			}
			const lastHandle = last(handles)!
			this.editor.setCurrentTool('select.dragging_handle', {
				shape: this.shape,
				isCreating: true,
				// remove the offset that we added to the handle when we created it
				handle: { ...lastHandle, x: lastHandle.x - 0.1, y: lastHandle.y - 0.1 },
				onInteractionEnd: 'shape-line',
			})
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onInterrupt: TLInterruptEvent = () => {
		this.parent.transition('idle')
		if (this.markId) this.editor.bailToMark(this.markId)
		this.editor.snaps.clearIndicators()
	}

	complete() {
		this.parent.transition('idle', { shapeId: this.shape.id })
		this.editor.snaps.clearIndicators()
	}

	cancel() {
		if (this.markId) this.editor.bailToMark(this.markId)
		this.parent.transition('idle', { shapeId: this.shape.id })
		this.editor.snaps.clearIndicators()
	}
}

export class ShapeLineIdle extends StateNode {
	static override id = 'idle'

	private shapeId = '' as TLShapeId

	override onEnter = (info: { shapeId: TLShapeId }) => {
		this.shapeId = info.shapeId
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = () => {
		this.parent.transition('pointing', { shapeId: this.shapeId })
	}

	override onCancel = () => {
		this.editor.setCurrentTool('select')
	}
}

class ShapeBrushTool extends StateNode {
	static override id = 'shape-brush'
	static override initial = 'idle'
	static override children = () => [Brushing, Idle]

	override onEnter = () => {
		this.editor.setCursor({ type: 'cross' })
	}
}

class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown = () => {
		this.parent.transition('brushing')
	}
}

class Brushing extends StateNode {
	static override id = 'brushing'

	override onPointerUp = () => {
		this.previousPoint = null
		this.parent.transition('idle')
	}

	override onEnter = () => {
		this.createShape()
	}

	override onPointerMove = () => {
		this.createShape()
	}

	nextWidth = 100
	nextHeight = 100
	nextRotation = 0
	previousPoint: null | VecLike = null
	nextCharacterIndex = 0
	text = 'tldraw is a very good whiteboard'
	createShape() {
		const point = this.editor.inputs.currentPagePoint
		const id = createShapeId()
		if (this.previousPoint) {
			this.nextRotation = Vec.Angle(this.previousPoint, point)
			// console.log(this.nextRotation)
			const distance = Vec.Dist(point, this.previousPoint)
			if (distance < 20) return
		}
		this.previousPoint = { ...point }
		const character = this.text[this.nextCharacterIndex]
		if (!character) return
		this.editor.createShape<TLTextShape>({
			id,
			type: 'text',
			x: point.x,
			y: point.y - 20,
			// x: point.x - this.nextWidth / 2,
			// y: point.y - this.nextHeight / 2,
			props: {
				// w: this.nextWidth,
				text: this.text[this.nextCharacterIndex],
			},
		})

		this.nextCharacterIndex++
		if (this.nextCharacterIndex >= this.text.length) {
			this.nextCharacterIndex = -1
		}
		// this.editor.createShape<TLGeoShape>({
		// 	id,
		// 	type: 'geo',
		// 	x: point.x - this.nextWidth / 2,
		// 	y: point.y - this.nextHeight / 2,
		// 	props: {
		// 		w: this.nextWidth,
		// 		h: this.nextHeight,
		// 		fill: 'semi',
		// 	},
		// })
		const shape = this.editor.getShape(id)!
		const selection = this.editor.getSelectedShapeIds()
		this.editor.select(id)
		this.editor.rotateShapesBy([shape], this.nextRotation)
		this.editor.select(...selection)
	}
}

export default function CustomToolExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={[ShapeBrushTool, ShapeLineShapeTool]}
				shapeUtils={[ShapeLineShapeUtil]}
				// initialState="shape-brush"
				persistenceKey="shape-tools"
				overrides={{
					tools(editor, tools) {
						tools.shapeBrush = {
							id: 'shape-brush',
							icon: 'color',
							label: 'Shape brush',
							kbd: 'c',
							onSelect: () => {
								editor.setCurrentTool('shape-brush')
							},
						}
						tools.shapeLine = {
							id: 'shape-line',
							icon: 'color',
							label: 'Shape line',
							kbd: 's',
							onSelect: () => {
								editor.setCurrentTool('shape-line')
							},
						}
						return tools
					},
				}}
				onMount={(editor) => {
					editor.updateInstanceState({ isDebugMode: false })
					// @ts-expect-error
					window['editor'] = editor
				}}
			/>
		</div>
	)
}

/* 
Introduction:

Tools are nodes in tldraw's state machine. They are responsible for handling user input. 
You can create custom tools by extending the `StateNode` class and overriding its methods.
In this example we make a very simple sticker tool that adds a heart emoji to the canvas 
when you click. 

[1]
We extend the `StateNode` class to create a new tool called `StickerTool`. We set its id
to "sticker". We are not implementing any child states in this example, so we don't need
to set an initial state or define any children states. To see an example of a custom tool
with child states, check out the screenshot tool or minimal examples.

	[a] The onEnter method is called when the tool is activated. We use it to set the cursor
		to a crosshair.
	
	[b] The onPointerDown method is called when the user clicks on the canvas. We use it to
		create a new shape at the click location. We can get the click location from the
		editor's inputs.

[2]
We pass our custom tool to the Tldraw component using the `tools` prop. We also set the
initial state to our custom tool. We hide the ui and add some helpful text to the canvas 
using the `onMount` prop. This is not necessary for the tool to work but it helps make the 
example more visually clear.
*/
