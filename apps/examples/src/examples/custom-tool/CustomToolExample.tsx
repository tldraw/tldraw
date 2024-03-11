import { StateNode, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const OFFSET = 12

// [1]
class StickerTool extends StateNode {
	static override id = 'sticker'

	// [a]
	override onEnter = () => {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	// [b]
	override onPointerDown = () => {
		const { currentPagePoint } = this.editor.inputs
		this.editor.createShape({
			type: 'text',
			x: currentPagePoint.x - OFFSET,
			y: currentPagePoint.y - OFFSET,
			props: { text: '❤️' },
		})
	}
}

// [2]
const customTools = [StickerTool]
export default function CustomToolExample() {
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
initial state to our custom tool. We hide the ui and add some helpful text to the canvas 
using the `onMount` prop. This is not necessary for the tool to work but it helps make the 
example more visually clear.
*/
