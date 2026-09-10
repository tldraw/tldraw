import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
// [1]
import './external-dialog.css'

export default function ExternalDialog() {
	return (
		<div style={{ margin: 32, width: 600, height: 400 }}>
			<Tldraw />
		</div>
	)
}

/*
[1]
By default the dialog overlay and positioner are `position: absolute` and fill the
`Tldraw` container. Switching them to `position: fixed` makes them fill the browser
window instead, so a dialog can be centered over the whole page even when the editor
is a small inset. See external-dialog.css.
*/
