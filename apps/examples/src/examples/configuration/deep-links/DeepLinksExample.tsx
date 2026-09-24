import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function DeepLinksExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="deep-links-example" options={{ deepLinks: true }} />
		</div>
	)
}
