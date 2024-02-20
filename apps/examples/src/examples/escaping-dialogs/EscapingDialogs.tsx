import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

// This CSS file overrides the default styles for dialogs
import './escaping-dialogs.css'

export default function EscapingDialogs() {
	return (
		<div style={{ margin: 32, width: 600, height: 400 }}>
			<Tldraw />
		</div>
	)
}
