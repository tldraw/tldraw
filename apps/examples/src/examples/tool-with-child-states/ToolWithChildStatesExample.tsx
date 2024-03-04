import { StateNode, TLEventHandlers, TLUnknownShape, Tldraw, createShapeId } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const OFFSET = -12

// [1]
class StickerTool extends StateNode {
	static override id = 'sticker'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing, Dragging]
}

class Idle extends StateNode {
	static override id = 'idle'
	override onEnter = () => {
		this.editor.setCursor({ type: 'cross' })
	}
	// [b]
	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		const { editor } = this
		switch (info.target) {
			case 'canvas': {
				const hitShape = editor.getShapeAtPoint(editor.inputs.currentPagePoint)
				if (hitShape) {
					this.onPointerDown({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}
				editor.selectNone()
				break
			}
			case 'shape': {
				if (editor.inputs.shiftKey) {
					editor.select(...editor.getSelectedShapeIds(), info.shape.id)
				} else {
					if (!editor.getSelectedShapeIds().includes(info.shape.id)) {
						editor.select(info.shape.id)
					}
					this.parent.transition('pointing', info)
				}
				break
			}
		}
	}
	override onDoubleClick: TLEventHandlers['onDoubleClick'] = (info) => {
		const { editor } = this
		if (info.phase !== 'up') return
		switch (info.target) {
			case 'canvas': {
				const hitShape = editor.getShapeAtPoint(editor.inputs.currentPagePoint)
				if (hitShape) {
					this.onDoubleClick({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}
				const { currentPagePoint } = editor.inputs
				editor.createShapes([
					{
						id: createShapeId(),
						type: 'text',
						x: currentPagePoint.x + OFFSET,
						y: currentPagePoint.y + OFFSET,
						props: { text: '❤️' },
					},
				])
				break
			}
			case 'shape': {
				editor.deleteShapes([info.shape.id])
				break
			}
		}
	}
}
class Pointing extends StateNode {
	static override id = 'pointing'

	override onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		this.parent.transition('idle', info)
	}

	override onPointerMove: TLEventHandlers['onPointerUp'] = () => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('dragging', { shapes: [...this.editor.getSelectedShapes()] })
		}
	}
}

class Dragging extends StateNode {
	static override id = 'dragging'
	//[a]
	private initialDraggingShapes = [] as TLUnknownShape[]
	//[b]
	override onEnter = (info: { shapes: TLUnknownShape[] }) => {
		this.initialDraggingShapes = info.shapes
	}
	//[c]
	override onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		this.parent.transition('idle', info)
	}
	//[d]
	override onPointerMove: TLEventHandlers['onPointerUp'] = () => {
		const { initialDraggingShapes } = this
		const { originPagePoint, currentPagePoint } = this.editor.inputs

		this.editor.updateShapes(
			initialDraggingShapes.map((shape) => {
				return {
					...shape,
					x: shape.x + (currentPagePoint.x - originPagePoint.x),
					y: shape.y + (currentPagePoint.y - originPagePoint.y),
				}
			})
		)
	}
}

// [2]
const customTools = [StickerTool]
export default function ToolWithChildStatesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Pass in the array of custom tool classes
				tools={customTools}
				// Set the initial state to the sticker tool
				initialState="sticker"
				// hide the ui
				hideUi
				// Put some helpful text on the canvas
				onMount={(editor) => {
					editor.createShape({
						type: 'text',
						x: 100,
						y: 100,
						props: { text: 'Click anywhere to add a sticker' },
					})
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
initial state to our custom tool. We also hide the ui and add some helpful text to the 
canvas using the `onMount` prop. This isn't necessary for the tool to work but it helps
make the example more visually clear.
*/
