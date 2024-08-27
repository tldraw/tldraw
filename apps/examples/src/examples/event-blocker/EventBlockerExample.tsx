import { TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function WelcomeScreen() {
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				pointerEvents: 'none', // [1]
			}}
		>
			<div
				style={{
					padding: 32,
					borderRadius: 20,
					boxShadow: '2px 2px 12px rgba(0,0,0,.2)',
					backgroundColor: 'white',
					pointerEvents: 'all', // [2]
					width: 400,
				}}
			>
				<p
					style={{
						userSelect: 'text', // [3]
					}}
				>
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
			<Tldraw persistenceKey="example" components={components} />
		</div>
	)
}

/*
[1]
This div will overlay the whole canvas. We want the user's pointer events to
pass through this div rather than getting blocked by it div, so we turn
pointer events off.

[2]
This is the container that's centered on the screen. For this div, we want to
block pointer events so that the user can't interact with the canvas behind it,
so we turn pointer events on.

[3]
As a side note, we also turn off user-select for anything inside of the canvas.
If you want the user to be able to select text, you can set this style to 'all'.
*/
