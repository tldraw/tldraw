import { StateNode, TLClickEventInfo, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function CustomDoubleClickBehaviorExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// [1]
				onMount={(editor) => {
					// [2]
					type IdleStateNode = StateNode & {
						handleDoubleClickOnCanvas(info: TLClickEventInfo): void
					}

					// [3]
					const selectIdleState = editor.getStateDescendant<IdleStateNode>('select.idle')
					if (!selectIdleState) throw Error('SelectTool Idle state not found')

					// [4]
					function customDoubleClickOnCanvasHandler(_info: TLClickEventInfo) {
						// Your custom behavior goes here...
						window.alert('double clicked on the canvas')
					}

					// [5]
					selectIdleState.handleDoubleClickOnCanvas =
						customDoubleClickOnCanvasHandler.bind(selectIdleState)
				}}
			/>
		</div>
	)
}

/*
This example demonstrates how to customize the double-click behavior on canvas
by overriding the SelectTool's Idle state's handleDoubleClickOnCanvas method.

Key concepts:

[1] onMount callback:
    The onMount callback gives us access to the editor instance after it's 
    fully initialized. This is where we can access and modify built-in tools.

[2] Type definition for IdleStateNode:
    We create a type that extends StateNode and includes the handleDoubleClickOnCanvas
    method. This gives us proper TypeScript support when accessing the method.

[3] Getting the SelectTool's Idle state:
    We use `editor.getStateDescendant<IdleStateNode>('select.idle')` to get a 
    reference to the Idle state of the SelectTool. The path 'select.idle' 
    refers to the SelectTool's 'idle' child state.

[4] Custom handler function:
    We define our custom behavior in a separate function. This keeps the code
    clean and makes it easy to test or reuse the handler logic.

[5] Method replacement with binding:
    We replace the original handleDoubleClickOnCanvas method with our custom
    implementation, binding it to the selectIdleState context so that `this`
    refers to the correct state node when the function is called. This 
    completely overrides the default behavior.

The handleDoubleClickOnCanvas method is called when the user double-clicks on
the canvas (not on a shape). By overriding this method, we can customize what
happens when the user double-clicks on empty space.

Note: This approach completely replaces the original method. If you want to 
preserve the original behavior and add to it, you should store a reference
to the original method before replacing it, then call it from your custom
implementation when appropriate.
*/
