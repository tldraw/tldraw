import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

export default function Example() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="my-editor" autoFocus />
		</div>
	)
}
