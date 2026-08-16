import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function PreventInstanceChangeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.updateInstanceState({ isGridMode: true })

					// Returning `prev` rejects the change no matter where it came from: menu, shortcut, or code.
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
