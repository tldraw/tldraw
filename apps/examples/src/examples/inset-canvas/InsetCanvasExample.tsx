import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import './inset-canvas.css'

export default function InsetCanvasExample() {
	return (
		<div className="tldraw__editor tldraw__editor-with-inset-canvas">
			<Tldraw />
		</div>
	)
}
