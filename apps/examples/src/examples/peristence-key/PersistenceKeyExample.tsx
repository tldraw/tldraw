import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function PersistenceKeyExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" />
		</div>
	)
}
