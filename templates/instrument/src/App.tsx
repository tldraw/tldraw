import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { shapeUtils } from './shapes'
import './styles/animations.css'

/**
 * Instrument template - a musical infinite canvas
 *
 * Click and hold an instrument to start playback. All instruments play together
 * in jazz-like polyrhythm. Quick-click to spawn new instruments (up to 3).
 *
 * The instruments draw generative art as they play - trees, shrubs, and bubbles
 * that grow organically. When playback stops, an AI agent may rearrange the
 * artwork for a more pleasing composition.
 */
function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					// Create the initial instrument (Chonk, the bass)
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					editor.createShape({
						type: 'instrument',
						x: 700,
						y: 325,
						props: { noteIndex: 0, variant: 0 },
					} as any)
				}}
			/>
		</div>
	)
}

export default App
