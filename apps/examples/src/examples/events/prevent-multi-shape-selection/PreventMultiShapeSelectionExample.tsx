import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function PreventMultiShapeSelectionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// The current selection lives on the `instance_page_state` record. Rather than
					// rejecting multi-selections outright, this handler rewrites them to keep only
					// the last id, so shift-clicking, brushing, and select-all still leave one shape
					// selected instead of doing nothing.
					editor.sideEffects.registerBeforeChangeHandler('instance_page_state', (prev, next) => {
						if (
							prev.selectedShapeIds !== next.selectedShapeIds &&
							next.selectedShapeIds.length > 1
						) {
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
