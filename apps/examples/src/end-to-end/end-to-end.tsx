import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

export default function EndToEnd() {
	;(window as any).__tldraw_editor_events = []
	return (
		<div className="tldraw__editor">
			<Tldraw
				autoFocus
				onUiEvent={(name, data) => {
					;(window as any).__tldraw_ui_event = { name, data }
				}}
				onMount={(editor) => {
					editor.on('event', (info) => {
						;(window as any).__tldraw_editor_events.push(info)
					})
				}}
			/>
		</div>
	)
}
