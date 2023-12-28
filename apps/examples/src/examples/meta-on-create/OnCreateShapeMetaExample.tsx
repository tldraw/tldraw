import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function OnCreateShapeMetaExample() {
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
						}
					}
				}}
			/>
		</div>
	)
}
