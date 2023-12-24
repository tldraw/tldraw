import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function OnChangeShapeMetaExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="tldraw_example"
				onMount={(editor) => {
					// See the "meta-on-create" example for more about setting the
					// initial meta for a shape.
					editor.getInitialMetaForShape = (_shape) => {
						return {
							updatedBy: editor.user.getId(),
							updatedAt: Date.now(),
						}
					}
					// We can also use the sideEffects API to modify a shape before
					// its change is committed to the database. This will run for
					// all shapes whenever they are updated.
					editor.sideEffects.registerBeforeChangeHandler('shape', (_prev, next, source) => {
						if (source !== 'user') return next
						next.meta = {
							updatedBy: editor.user.getId(),
							updatedAt: Date.now(),
						}
						return next
					})
				}}
			/>
		</div>
	)
}
