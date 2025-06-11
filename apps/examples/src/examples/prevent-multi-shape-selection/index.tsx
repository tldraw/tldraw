import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function PreventMultiShapeSelectionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [1]
					editor.sideEffects.registerBeforeChangeHandler('instance_page_state', (prev, next) => {
						// [2]
						if (
							prev.selectedShapeIds !== next.selectedShapeIds &&
							next.selectedShapeIds.length > 1
						) {
							// [3]
							return {
								...next,
								selectedShapeIds: [next.selectedShapeIds[next.selectedShapeIds.length - 1]],
							}
						}
						return next
					})
				}}
			/>
		</div>
	)
}

/*
In this example, we want to prevent the user from selecting multiple shapes at once.

[1]
Here we register a handler that will run whenever a change is about to be made to
an "instance_page_state" type record, which contains the current selection state.

[2]
We check if this is a selection change (prev.selectedShapeIds !== next.selectedShapeIds)
and if it would result in multiple shapes being selected (next.selectedShapeIds.length > 1).

[3]
If both conditions are true, we modify the change to only select the most recently
selected shape by returning a new record with a single selected shape ID.
*/
