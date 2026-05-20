import { useEffect } from 'react'
import {
	TLAnyOverlayUtilConstructor,
	TLDrawShape,
	Tldraw,
	VecModel,
	b64Vecs,
	createShapeId,
	defaultOverlayUtils,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { anchor$, tapeStroke$ } from './tape-state'
import { TapeOverlayUtil } from './TapeOverlayUtil'
import './digital-tape.css'

// There's a guide at the bottom of this file!

// [1]
const ANCHOR_FOLLOW_RATE = 0.01
const MIN_RECORD_DISTANCE = 2

// [2]
const overlayUtils: TLAnyOverlayUtilConstructor[] = [...defaultOverlayUtils, TapeOverlayUtil]

function isEditableTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false
	const tag = target.tagName
	return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

// [3]
function TapeController() {
	const editor = useEditor()

	useEffect(() => {
		function onTick() {
			const leader = editor.inputs.getCurrentPagePoint()
			const current = anchor$.get()

			// First tick: snap the anchor to the leader.
			if (!current) {
				anchor$.set({ x: leader.x, y: leader.y })
				return
			}

			const next = {
				x: current.x + (leader.x - current.x) * ANCHOR_FOLLOW_RATE,
				y: current.y + (leader.y - current.y) * ANCHOR_FOLLOW_RATE,
			}
			anchor$.set(next)

			// While the user is pulling tape, append the anchor's path to the
			// in-progress stroke.
			const stroke = tapeStroke$.get()
			if (!stroke) return
			const last = stroke.points[stroke.points.length - 1]
			const rx = next.x - stroke.origin.x
			const ry = next.y - stroke.origin.y
			const dx = rx - last.x
			const dy = ry - last.y
			if (dx * dx + dy * dy > MIN_RECORD_DISTANCE * MIN_RECORD_DISTANCE) {
				tapeStroke$.set({
					origin: stroke.origin,
					points: [...stroke.points, { x: rx, y: ry, z: 0.5 }],
				})
			}
		}

		editor.on('tick', onTick)
		return () => {
			editor.off('tick', onTick)
		}
	}, [editor])

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.code !== 'Space' || e.repeat) return
			if (isEditableTarget(e.target)) return
			if (editor.getEditingShapeId()) return
			e.preventDefault()
			if (tapeStroke$.get()) return

			const anchor = anchor$.get() ?? { x: 0, y: 0 }
			tapeStroke$.set({
				origin: { x: anchor.x, y: anchor.y },
				points: [{ x: 0, y: 0, z: 0.5 }],
			})
		}

		function onKeyUp(e: KeyboardEvent) {
			if (e.code !== 'Space') return
			const stroke = tapeStroke$.get()
			if (!stroke) return
			tapeStroke$.set(null)

			if (stroke.points.length < 2) return
			const points: VecModel[] = stroke.points
			editor.createShape<TLDrawShape>({
				id: createShapeId(),
				type: 'draw',
				x: stroke.origin.x,
				y: stroke.origin.y,
				props: {
					segments: [{ type: 'free', path: b64Vecs.encodePoints(points) }],
				},
			})
		}

		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)
		return () => {
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
		}
	}, [editor])

	return <div className="tape-hint">Hold space to lay down tape</div>
}

// [4]
export default function DigitalTapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="digital-tape-example"
				options={{ spacebarPanning: false }}
				overlayUtils={overlayUtils}
			>
				<TapeController />
			</Tldraw>
		</div>
	)
}

/*
This example recreates the "digital tape drawing" technique. There are two
indicators on the canvas: a leader that tracks the cursor and an anchor that
trails behind it. While you hold space, the anchor's path is recorded and
rendered as a live preview. Releasing space commits the traced path as a draw
shape, the same way a length of physical tape can be guided into a curve by
pulling its loose end.

[1]
ANCHOR_FOLLOW_RATE controls how slowly the anchor catches up to the leader on
each tick (0..1) — smaller numbers give a longer, smoother trail.
MIN_RECORD_DISTANCE keeps the recorded path from being spammed with
near-duplicate points.

[2]
The indicators, the connector line, and the live tape preview are all painted
by a single `OverlayUtil` registered alongside the default overlays. Overlays
draw into a shared canvas 2D context (already transformed to page space), so
they redraw automatically whenever the atoms they read from change.

[3]
The controller component is a pure side-effect manager. On every tick it
lerps the anchor toward the cursor and appends to the in-progress stroke.
Spacebar starts and ends a stroke; on release we encode the recorded points
into a draw shape positioned at the stroke origin.

[4]
We disable spacebarPanning so that holding space draws tape rather than
panning the camera, and register `TapeOverlayUtil` after the defaults so it
paints on top of selection handles and brush.
*/
