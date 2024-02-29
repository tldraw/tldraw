import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function Develop() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="tldraw_example" />
		</div>
	)
}
