import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

export default function Example() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="tldraw_example" autoFocus />
		</div>
	)
}
