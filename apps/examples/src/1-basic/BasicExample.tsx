import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function Example() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="tldraw_example" autoFocus />
		</div>
	)
}
