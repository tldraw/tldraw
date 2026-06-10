import { useState } from 'react'
import { Editor, TLGeoShape, Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'
import './edge-scrolling.css'

// There's a guide at the bottom of this file!

// [1]
interface EdgeScrollValues {
	edgeScrollSpeed: number
	edgeScrollDelay: number
	edgeScrollEaseDuration: number
	edgeScrollDistance: number
}

const DEFAULTS: EdgeScrollValues = {
	edgeScrollSpeed: 25,
	edgeScrollDelay: 200,
	edgeScrollEaseDuration: 200,
	edgeScrollDistance: 8,
}

const CONTROLS = [
	{ key: 'edgeScrollSpeed', label: 'Speed (px per tick)', min: 0, max: 100, step: 5 },
	{ key: 'edgeScrollDelay', label: 'Delay (ms)', min: 0, max: 1000, step: 50 },
	{ key: 'edgeScrollEaseDuration', label: 'Ease duration (ms)', min: 0, max: 1000, step: 50 },
	{ key: 'edgeScrollDistance', label: 'Edge zone size (px)', min: 0, max: 240, step: 8 },
] as const

// [2]
function ControlsPanel({
	values,
	onCommit,
}: {
	values: EdgeScrollValues
	onCommit(next: EdgeScrollValues): void
}) {
	const [pending, setPending] = useState(values)

	return (
		<div className="edge-scrolling__panel">
			<div className="edge-scrolling__title">Edge scrolling options</div>
			{CONTROLS.map((control) => {
				// read the slider's value from the DOM at commit time so the commit
				// can't lag behind the last change event
				const commit = (input: HTMLInputElement) =>
					onCommit({ ...pending, [control.key]: Number(input.value) })

				return (
					<label key={control.key} className="edge-scrolling__row">
						<span>
							{control.label}: <b>{pending[control.key]}</b>
						</span>
						<input
							type="range"
							min={control.min}
							max={control.max}
							step={control.step}
							value={pending[control.key]}
							onChange={(e) =>
								setPending({ ...pending, [control.key]: Number(e.currentTarget.value) })
							}
							onPointerUp={(e) => commit(e.currentTarget)}
							onKeyUp={(e) => commit(e.currentTarget)}
							onBlur={(e) => commit(e.currentTarget)}
						/>
					</label>
				)
			})}
			<button
				className="edge-scrolling__reset"
				onClick={() => {
					setPending(DEFAULTS)
					onCommit(DEFAULTS)
				}}
			>
				Reset to defaults
			</button>
		</div>
	)
}

// [3]
function createDemoShapes(editor: Editor) {
	// changing the options prop recreates the editor but keeps the store, so
	// only create the demo shapes on the first mount
	if (editor.getCurrentPageShapeIds().size > 0) return

	editor.createShape({
		type: 'text',
		x: 120,
		y: 80,
		props: {
			richText: toRichText('Drag a shape toward the edge of the window to edge scroll'),
		},
	})
	const colors = ['blue', 'orange', 'green'] as const
	colors.forEach((color, i) => {
		editor.createShape<TLGeoShape>({
			type: 'geo',
			x: 150 + i * 220,
			y: 200,
			props: { w: 140, h: 140, fill: 'solid', color },
		})
	})
}

export default function EdgeScrollingExample() {
	const [values, setValues] = useState(DEFAULTS)

	return (
		<div className="tldraw__editor edge-scrolling">
			{/* [4] */}
			<Tldraw options={values} onMount={createDemoShapes} />
			<ControlsPanel values={values} onCommit={setValues} />
		</div>
	)
}

/*
This example shows how to configure edge scrolling: the behavior that
automatically pans the camera when you drag a shape (or a selection brush)
close to the edge of the viewport.

[1]
Edge scrolling is configured through four editor options:

- edgeScrollSpeed: the base scroll speed in pixels per tick (default 25).
  The speed also scales with how close the pointer is to the edge, and is
  reduced on small screens.
- edgeScrollDelay: how long (ms) the pointer must stay near the edge before
  scrolling starts (default 200). Raising it prevents accidental scrolls.
- edgeScrollEaseDuration: how long (ms) the scroll takes to accelerate from
  zero to full speed once it starts (default 200).
- edgeScrollDistance: the width in pixels of the edge zone that triggers
  scrolling (default 8). Pointer positions outside the window scroll at full
  speed. Try a large zone (200+): since you grab a shape near its middle,
  scrolling then kicks in as soon as the shape itself touches the window
  edge, rather than waiting for the pointer to get there.

[2]
The sliders commit when you release them rather than while you drag.
That's because editor options are read once when the editor instance is
created: changing the options prop tears down and recreates the editor, so
we don't want to do it dozens of times per second mid-drag. Commits fire on
pointer release, key release (so keyboard adjustment works too), and blur —
re-committing an unchanged value is harmless, since the Tldraw component
shallow-compares its options.

[3]
A few shapes to drag around. Grab one and hold it near a window edge to see
the camera start scrolling; adjust the sliders and try again.

[4]
Options are passed via the Tldraw component's options prop. Any option from
TldrawOptions can be overridden this way; unspecified options keep their
defaults.
*/
