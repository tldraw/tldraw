import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this page!

export default function PreventInstanceChangeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.updateInstanceState({ isGridMode: true })

					// [1]
					editor.sideEffects.registerBeforeChangeHandler('instance', (prev, next) => {
						if (!next.isGridMode) {
							return prev
						}
						return next
					})
				}}
			/>
		</div>
	)
}

/*
In this example, we want to prevent the user from changing the isGridMode property.

[1]
Here we register a handler that will run whenever a change is about to be made to
to an "instance" type record.

The logic we want is that: if the new instance has `isGridMode` set to `false`, then
we want to reject the change; otherwise, we want to allow it.

To reject the change, we return the previous record. To allow the change, we
return the next record.
*/
