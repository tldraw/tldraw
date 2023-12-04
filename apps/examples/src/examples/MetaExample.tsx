import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function MetaExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="tldraw_example"
				onMount={(editor) => {
					// There's no API for setting getInitialMetaForShape yet, but
					// you can replace it at runtime like this. This will run for
					// all shapes created by the user.
					editor.getInitialMetaForShape = (_shape) => {
						return {
							createdBy: editor.user.getId(),
							createdAt: Date.now(),
							updatedBy: editor.user.getId(),
							updatedAt: Date.now(),
						}
					}
					// We can also use the sideEffects API to modify a shape before
					// its change is committed to the database. This will run for
					// all shapes whenever they are updated.
					editor.sideEffects.registerBeforeChangeHandler('shape', (record, _prev, source) => {
						if (source !== 'user') return record
						record.meta = {
							...record.meta,
							updatedBy: editor.user.getId(),
							updatedAt: Date.now(),
						}
						return record
					})
				}}
			/>
		</div>
	)
}
