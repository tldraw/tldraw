import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

export default function ForEndToEndTests() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				autoFocus
				onUiEvent={(name, data) => {
					;(window as any).__tldraw_event = { name, data }
				}}
			/>
		</div>
	)
}
