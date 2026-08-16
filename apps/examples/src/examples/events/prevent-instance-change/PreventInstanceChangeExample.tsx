import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function PreventInstanceChangeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.updateInstanceState({ isGridMode: true })

					// A before-change handler returns the record that will actually be written.
					// Returning `prev` rejects the change; returning `next` allows it. Any change
					// that would turn grid mode off is rejected here, whether it comes from the
					// menu, the keyboard shortcut, or your own code.
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
