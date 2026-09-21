import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function PreventMultiShapeSelectionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// Rewriting to the last id (rather than rejecting) keeps brushing and select-all usable.
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
