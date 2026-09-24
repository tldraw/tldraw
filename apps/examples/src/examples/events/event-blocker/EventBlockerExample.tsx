import { TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import './event-blocker.css'

// There's a guide at the bottom of this file!

function WelcomeScreen() {
	return (
		// [1]
		<div className="event-blocker__backdrop">
			{/* [2] */}
			<div className="event-blocker__panel">
				{/* [3] */}
				<p>
					Notice that if you click on this box or start a drag from in here, you will not be
					interacting with the canvas. However, you can still interact with the canvas by clicking
					anywhere else!
				</p>
				<div>
					<button onClick={() => window.alert('Thanks')}>Click here</button>
				</div>
			</div>
		</div>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: WelcomeScreen,
}

export default function EventBlockerExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="event-blocker-example" components={components} />
		</div>
	)
}

/*
[1]
The `InFrontOfTheCanvas` slot is a full-size layer over the canvas that starts with
`pointer-events: none`, so anything rendered here is click-through by default. This
backdrop just centers the panel; pointer events pass straight through it to the canvas.

[2]
Setting `pointer-events: all` on the panel opts it back in. The slot sits above the canvas
and marks pointer events that start inside it as handled (see `editor.markEventAsHandled`),
so tldraw ignores them: clicking or dragging here won't select, draw, or pan. You don't need
to call `stopPropagation` yourself.

[3]
tldraw disables text selection everywhere inside its container so that dragging on the
canvas doesn't highlight text. If you want the user to be able to select text in your
overlay, set `user-select: text` on it.
*/
