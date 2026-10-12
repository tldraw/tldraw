import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function DisablePagesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="disable-pages" options={{ maxPages: 1 }} />
		</div>
	)
}
