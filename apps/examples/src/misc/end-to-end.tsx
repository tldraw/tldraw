import { Tldraw, useActions } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useEffect } from 'react'
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
			>
				<SneakyExportButton />
			</Tldraw>
		</div>
	)
}

function SneakyExportButton() {
	const actions = useActions()

	useEffect(() => {
		;(window as any)['tldraw-export'] = () => actions['export-as-svg'].onSelect('unknown')
	}, [actions])

	return null
}
