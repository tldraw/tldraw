import { useState } from 'react'
import 'tldraw/tldraw.css'
import { CustomerSpreadEditor } from './CustomerSpreadEditor'
import './nested-clip-bug-repro.css'

export default function NestedClipBugReproExample() {
	const [simulateLegacy, setSimulateLegacy] = useState(false)

	return (
		<div className="NestedClipBugRepro-root">
			<header className="NestedClipBugRepro-intro">
				<h1>Nested clip regression</h1>
				<p>
					{simulateLegacy
						? 'Legacy segment–segment SH forced on the broken spread’s left image (right-hand spread). Toggle off to see the fixed SDK mask.'
						: 'Customer photobook layout: spread → page → template → layout → image. Left spread clips once; right spread clips at every level (identical 400×600 rects).'}
				</p>
				<label className="NestedClipBugRepro-legacyToggle">
					<input
						type="checkbox"
						checked={simulateLegacy}
						onChange={(e) => setSimulateLegacy(e.target.checked)}
					/>
					Simulate pre-fix clip on broken left image
				</label>
			</header>

			<div className="NestedClipBugRepro-singleEditor">
				<CustomerSpreadEditor simulateLegacy={simulateLegacy} />
			</div>
		</div>
	)
}
