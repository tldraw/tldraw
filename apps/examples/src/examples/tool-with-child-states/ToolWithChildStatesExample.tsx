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
					if (!editor.getSelectedShapeIds().includes(info.shape.id)) {
						editor.select(info.shape.id)
					}
					this.parent.transition('pointing', { shape: info.shape })
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
class Pointing extends StateNode {
	static override id = 'pointing'
	private shape: TLTextShape | null = null

	override onEnter = (info: { shape: TLTextShape | null }) => {
		this.shape = info.shape
	}
	override onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		this.parent.transition('idle', info)
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('dragging', { shape: this.shape })
		}
	}
}

class Dragging extends StateNode {
	static override id = 'dragging'
	private shape: TLShapePartial | null = null
	private emojiArray = ['❤️', '🔥', '👍', '👎', '😭', '🤣']

	override onEnter = (info: { shape: TLShapePartial }) => {
		const { currentPagePoint } = this.editor.inputs
		const newShape = {
			id: createShapeId(),
			type: 'text',
			x: currentPagePoint.x,
			y: currentPagePoint.y,
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
	override onPointerUp: TLEventHandlers['onPointerUp'] = (info) => {
		this.parent.transition('idle', info)
	}
	//[d]

	override onPointerMove: TLEventHandlers['onPointerUp'] = () => {
		const { shape } = this
		const { originPagePoint, currentPagePoint } = this.editor.inputs
		// distance from the origin point
		const distance = originPagePoint.dist(currentPagePoint)
		if (shape) {
			this.editor.updateShape({
				id: shape.id,
				type: 'text',
				props: {
					text: this.emojiArray[Math.floor(distance / 10) % this.emojiArray.length],
				},
			})
		}
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
						props: {
							text: 'Double click the canvas to add a sticker\nDouble click a sticker to delete it\nClick and drag on a sticker to change it\nClick and drag on the canvas to create a sticker\nShift click a sticker for a surprise!',
							align: 'start',
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
