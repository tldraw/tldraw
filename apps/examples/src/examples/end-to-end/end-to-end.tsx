import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
;(window as any).__tldraw_ui_event = { id: 'NOTHING_YET' }
;(window as any).__tldraw_editor_events = []

export default function EndToEnd() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.on('event', (info) => {
						;(window as any).__tldraw_editor_events.push(info)
					})
				}}
				onUiEvent={(name, data) => {
					;(window as any).__tldraw_ui_event = { name, data }
				}}
			/>
		</div>
	)
}
