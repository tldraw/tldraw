import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// You can set the `maxPages` option to 1 to disable UI related to managing multiple pages.

export default function DisablePagesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="disable-pages" options={{ maxPages: 1 }} />
		</div>
	)
}
