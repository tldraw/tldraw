import { StateNode, TLClickEventInfo, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
type IdleStateNode = StateNode & {
	handleDoubleClickOnCanvas(info: TLClickEventInfo): void
}

export default function CustomDoubleClickBehaviorExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [2]
					const selectIdleState = editor.getStateDescendant<IdleStateNode>('select.idle')
					if (!selectIdleState) throw Error('SelectTool Idle state not found')

					// [3]
					selectIdleState.handleDoubleClickOnCanvas = function (_info: TLClickEventInfo) {
						window.alert('double clicked on the canvas')
					}
				}}
			/>
		</div>
	)
}

/*
The select tool's `Idle` state calls `handleDoubleClickOnCanvas` when the user double-clicks
on empty canvas (or on a shape that can't be edited). By default it creates a text shape and
starts editing it. Here we swap that method out at runtime for one that shows an alert.

[1]
The `Idle` class itself isn't exported from `tldraw`, and `handleDoubleClickOnCanvas` isn't
part of the public `StateNode` type, so we describe the shape we expect and cast to it.

[2]
`editor.getStateDescendant` walks the tool state tree by dotted path: `'select'` is the
select tool, `'select.idle'` is its idle child state. Because tools are singletons created
when the editor mounts, `onMount` is a safe place to patch them.

[3]
Assigning a `function` (rather than an arrow function) means `this` inside it is the state
node, the same as it would be for the original method. This replaces the default behavior
entirely; if you want to extend it instead, keep a reference to the original method and call
it from your replacement.

If all you want is to turn the default off, there's a simpler route: pass
`options={{ createTextOnCanvasDoubleClick: false }}` to `<Tldraw>`.
*/
