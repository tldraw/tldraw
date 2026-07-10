import { TldrawUiButton } from '@tldraw/ui'
import { useState } from 'react'
import { createShapeId, Tldraw, TLShapeId, toRichText, useEditor } from 'tldraw'
import { ExampleTldrawUiProvider } from '../../../misc/ExampleTldrawUiProvider'
import 'tldraw/tldraw.css'

// [1]
const TEMPLATE_IDS: TLShapeId[] = [
	createShapeId('t1'),
	createShapeId('t2'),
	createShapeId('t3'),
	createShapeId('t4'),
]

// [2]
function ControlPanel() {
	const editor = useEditor()

	// [3] Local state mirrors editor.options.selectLockedShapes for the UI.
	// The option is readonly at the type level but the editor stores a copy
	// internally that the SelectTool reads live on every interaction — so
	// mutating the underlying field flips behaviour immediately, without a
	// remount.
	const [selectLocked, setSelectLocked] = useState(editor.options.selectLockedShapes)

	const toggleSelectLocked = () => {
		const next = !selectLocked
		;(editor.options as { selectLockedShapes: boolean }).selectLockedShapes = next
		setSelectLocked(next)
	}

	// [4] Update locked shapes using ignoreShapeLock option
	// Without ignoreShapeLock: true, these updates would be blocked
	const handleScatter = () => {
		editor.run(
			() => {
				editor.updateShapes(
					TEMPLATE_IDS.map((id) => ({
						id,
						type: 'geo',
						x: 50 + Math.random() * 300,
						y: 50 + Math.random() * 300,
					}))
				)
			},
			{ ignoreShapeLock: true }
		)
	}

	const handleReset = () => {
		editor.run(
			() => {
				editor.updateShapes([
					{ id: TEMPLATE_IDS[0], type: 'geo', x: 100, y: 100 },
					{ id: TEMPLATE_IDS[1], type: 'geo', x: 250, y: 100 },
					{ id: TEMPLATE_IDS[2], type: 'geo', x: 100, y: 250 },
					{ id: TEMPLATE_IDS[3], type: 'geo', x: 250, y: 250 },
				])
			},
			{ ignoreShapeLock: true }
		)
	}

	return (
		<ExampleTldrawUiProvider>
			<div className="tl-menu" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
				<label
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 6,
						fontSize: 13,
						cursor: 'pointer',
						userSelect: 'none',
					}}
					title="When on, left-click and brush selection include locked shapes."
				>
					<input type="checkbox" checked={selectLocked} onChange={toggleSelectLocked} />
					Allow selecting locked shapes
				</label>
				<TldrawUiButton type="normal" onClick={handleScatter}>
					Scatter
				</TldrawUiButton>
				<TldrawUiButton type="normal" onClick={handleReset}>
					Reset
				</TldrawUiButton>
			</div>
		</ExampleTldrawUiProvider>
	)
}

const components = {
	TopPanel: ControlPanel,
}

// [5]
export default function LockedShapesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					// Skip if shapes already exist
					if (editor.getShape(TEMPLATE_IDS[0])) {
						editor.zoomToFit({ animation: { duration: 0 } })
						return
					}

					// [6] Create locked template shapes
					const shapeProps = {
						geo: 'rectangle' as const,
						w: 130,
						h: 130,
						dash: 'dashed' as const,
						color: 'light-blue' as const,
						fill: 'semi' as const,
						richText: toRichText('Locked'),
					}

					editor.createShapes([
						{ id: TEMPLATE_IDS[0], type: 'geo', x: 100, y: 100, props: shapeProps },
						{ id: TEMPLATE_IDS[1], type: 'geo', x: 250, y: 100, props: shapeProps },
						{ id: TEMPLATE_IDS[2], type: 'geo', x: 100, y: 250, props: shapeProps },
						{ id: TEMPLATE_IDS[3], type: 'geo', x: 250, y: 250, props: shapeProps },
					])

					// [7] Lock them immediately
					editor.toggleLock(TEMPLATE_IDS)
					editor.zoomToFit({ animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}

/*
This example demonstrates two ways the editor distinguishes user interaction
from programmatic mutation on locked shapes:

1. `editor.run(fn, { ignoreShapeLock: true })` bypasses the lock guard for
   the duration of the callback, so the Scatter / Reset buttons can move
   shapes the user can't drag.
2. `editor.options.selectLockedShapes` controls whether locked shapes can be
   *selected* (via left-click, brush select, scribble select). The lock
   guards on moving, resizing, editing, and deleting still apply — selection
   is the only thing this option unlocks.

[1] Pre-defined shape IDs so we can reference them later.

[2] Control panel with the new toggle plus the existing action buttons.

[3] Local React state mirrors the live editor option. The option is
`readonly` at the type level (it's intended as initial editor config) but
the editor stores a single mutable copy that the SelectTool reads on every
relevant pointer event. Mutating the field changes behaviour immediately
without remounting. The cast through `{ selectLockedShapes: boolean }`
isolates the type relaxation to one line.

[4] Both buttons use `editor.run()` with `{ ignoreShapeLock: true }` to
bypass the lock constraint. This option allows programmatic updates even
though user interactions on these shapes are blocked.

[5] The main component sets up the editor.

[6] On mount, we create a 2x2 grid of template shapes.

[7] We immediately lock them with `toggleLock()`. The key behavior: users
cannot move or delete these shapes, but the Scatter / Reset buttons can
still reposition them programmatically.

Try it:
- Default: try left-clicking a template shape — nothing happens (locked
  shapes aren't selectable). Right-click still selects.
- Flip the "Allow selecting locked shapes" toggle on, then left-click or
  brush-select across a template shape — it gets selected. Try to drag it
  by the handles — the lock guard still prevents the move.
- Click Scatter or Reset to see how programmatic updates work with
  `ignoreShapeLock: true` regardless of the toggle.
*/
