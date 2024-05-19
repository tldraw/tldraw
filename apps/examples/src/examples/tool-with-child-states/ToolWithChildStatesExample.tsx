import {
	StateNode,
	TLEventHandlers,
	TLShapePartial,
	TLTextShape,
	Tldraw,
	createShapeId,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const OFFSET = -12

// [1]
class StickerTool extends StateNode {
	static override id = 'sticker'
	static override initial = 'idle'
	static override children = () => [Idle, Pointing, Dragging]
}

// [2]
class Idle extends StateNode {
	static override id = 'idle'
	//[a]
	override onEnter = () => {
		this.editor.setCursor({ type: 'cross' })
	}
	//[b]
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
				this.parent.transition('pointing', { shape: null })
				break
			}
			case 'shape': {
				if (editor.inputs.shiftKey) {
					editor.updateShape({
						id: info.shape.id,
						type: 'text',
						props: { text: '👻 boo!' },
					})
				} else {
					this.parent.transition('pointing', { shape: info.shape })
				}
				break
			}
		}
	}
	//[c]
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
				editor.createShape({
					type: 'text',
					x: currentPagePoint.x + OFFSET,
					y: currentPagePoint.y + OFFSET,
					props: { text: '❤️' },
				})
				break
			}
			case 'shape': {
				editor.deleteShapes([info.shape.id])
				break
			}
		}
	}
}
// [3]
class Pointing extends StateNode {
	static override id = 'pointing'
	private shape: TLTextShape | null = null

	override onEnter = (info: { shape: TLTextShape | null }) => {
		this.shape = info.shape
	}
	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.parent.transition('idle')
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('dragging', { shape: this.shape })
		}
	}
}

// [4]
class Dragging extends StateNode {
	static override id = 'dragging'
	// [a]
	private shape: TLShapePartial | null = null
	private emojiArray = ['❤️', '🔥', '👍', '👎', '😭', '🤣']

	// [b]
	override onEnter = (info: { shape: TLShapePartial }) => {
		const { currentPagePoint } = this.editor.inputs
		const newShape = {
			id: createShapeId(),
			type: 'text',
			x: currentPagePoint.x + OFFSET,
			y: currentPagePoint.y + OFFSET,
			props: { text: '❤️' },
		}
		if (info.shape) {
			this.shape = info.shape
		} else {
			this.editor.createShape(newShape)
			this.shape = { ...newShape }
		}
	}
	//[c]
	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.parent.transition('idle')
	}
	//[d]

	override onPointerMove: TLEventHandlers['onPointerUp'] = () => {
		const { shape } = this
		const { originPagePoint, currentPagePoint } = this.editor.inputs
		const distance = originPagePoint.dist(currentPagePoint)
		if (shape) {
			this.editor.updateShape({
				id: shape.id,
				type: 'text',
				props: {
					text: this.emojiArray[Math.floor(distance / 20) % this.emojiArray.length],
				},
			})
		}
	}
}

// [5]
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
						x: 50,
						y: 50,
						props: {
							text: '-Double click the canvas to add a sticker\n-Double click a sticker to delete it\n-Click and drag on a sticker to change it\n-Click and drag on the canvas to create a sticker\n-Shift click a sticker for a surprise!',
							size: 's',
							textAlign: 'start',
						},
					})
				}}
			/>
		</div>
	)
}

/* 
Introduction:

Tools are nodes in tldraw's state machine. They are responsible for handling user input. 
You can create custom tools by extending the `StateNode` class and overriding its 
methods. In this example we expand on the sticker tool from the custom tool example to 
show how to create a tool that can handle more complex interactions by using child states.

[1]
This is our custom tool. It has three child states: `Idle`, `Pointing`, and `Dragging`.
We need to define the `id` and `initial` properties, the id is a unique string that
identifies the tool to the editor, and the initial property is the initial state of the
tool. We also need to define a `children` method that returns an array of the tool's
child states.

[2]
This is our Idle state. It is the initial state of the tool. It's job is to figure out
what the user is trying to do and transition to the appropriate state. When transitioning 
between states we can use the second argument to pass data to the new state. It has three 
methods:

	[a] `onEnter` 
	When entering any state, the `onEnter` method is called. In this case, we set the cursor to 
	a crosshair.

	[b] `onPointerDown`
	This method is called when the user presses the mouse button. The target parameter is always
	the canvas, so we can use an editor method to check if we're over a shape, and call the 
	method again with the shape as the target. If we are over a shape, we transition to the
	`pointing` state with the shape in the info object. If we're over a shape and holding the 
	shift key, we update the shape's text. If we're over the canvas, we transition to the 
	`pointing` state with a null shape in the info object.
	
	[c] `onDoubleClick`
	This method is called when the user double clicks the mouse button. We're using some similar
	logic here to check if we're over a shape, and if we are, we delete it. If we're over the canvas,
	we create a new shape.

[3]
This is our `Pointing` state. It's a transitionary state, we use it to store the shape we're pointing
at, and transition to the dragging state if the user starts dragging. It has three methods:

	[a] `onEnter`
	When entering this state, we store the shape we're pointing at by getting it from the info object.

	[b] `onPointerUp`
	This method is called when the user releases the mouse button. We transition to the `idle` state.

	[c] `onPointerMove`
	This method is called when the user moves the mouse. If the user starts dragging, we transition to
	the `dragging` state and pass the shape we're pointing at.

[4]
This is our `Dragging` state. It's responsible for creating and updating the shape that the user is 
dragging.

	[a] `onEnter`
	When entering this state, we create a new shape if we're not dragging an existing one. If we are, 
	we store the shape we're dragging.

	[b] `onPointerUp`
	This method is called when the user releases the mouse button. We transition to the `idle` state.

	[c] `onPointerMove`
	This method is called when the user moves the mouse. We use the distance between the origin and 
	current mouse position to cycle through an array of emojis and update the shape's text.

[5]
We pass our custom tool to the `Tldraw` component as an array. We also set the initial state to our
custom tool. For the purposes of this demo, we're also hiding the UI and adding some helpful text to
the canvas.
*/
