import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" />
		</div>
	)
}
