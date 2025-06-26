import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import './gcse-canvas.css'

export default function GcseCanvasExample() {
	return (
		<div className="gcse-layout">
			<div className="gcse-question">
				<h1>GCSE Maths Question</h1>
				<p>
					Using ruler and compass construction, draw a triangle with sides 5&nbsp;cm, 7&nbsp;cm and
					8&nbsp;cm.
				</p>
				<p>Draw your construction on the canvas.</p>
			</div>
			<div className="tldraw__editor gcse-canvas">
				<Tldraw cameraOptions={{ isLocked: true }} />
			</div>
		</div>
	)
}
