import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// This CSS file overrides the default styles for dialogs
import './external-dialog.css'

export default function ExternalDialog() {
	return (
		<div style={{ margin: 32, width: 600, height: 400 }}>
			<Tldraw />
		</div>
	)
}
