import { useEffect } from 'react'
import { Tldraw, exportAs, useActions, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { EndToEndApi } from './EndToEndApi'
;(window as any).__tldraw_ui_event = { id: 'NOTHING_YET' }
;(window as any).__tldraw_editor_events = []

export default function EndToEnd() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					;(window as any).app = editor
					;(window as any).editor = editor

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
	const editor = useEditor()
	const actions = useActions()

	useEffect(() => {
		const api: EndToEndApi = {
			exportAsSvg: () => actions['export-as-svg'].onSelect('unknown'),
			exportAsFormat: (format) =>
				exportAs(editor, editor.selectAll().getSelectedShapeIds(), format, 'test'),
		}
		;(window as any).tldrawApi = api
	}, [actions, editor])

	return null
}
