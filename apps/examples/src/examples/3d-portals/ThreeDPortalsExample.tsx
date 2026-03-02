import { useEffect, useRef } from 'react'
import { createShapeId, Editor, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './3d-portals.css'
import { type SimState, checkDrops, createSimState, render, syncPortals, tick } from './simulation'

// [1]
let simState: SimState = createSimState()

// [2]
function PortalOverlay() {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		function onTick() {
			syncPortals(simState, editor)

			const toDelete = checkDrops(simState, editor)
			if (toDelete.length > 0) {
				editor.deleteShapes(toDelete)
			}

			tick(simState)

			const parent = canvas!.parentElement
			if (!parent) return

			const dpr = window.devicePixelRatio || 1
			const w = parent.clientWidth
			const h = parent.clientHeight
			const tw = Math.round(w * dpr)
			const th = Math.round(h * dpr)

			if (canvas!.width !== tw || canvas!.height !== th) {
				canvas!.width = tw
				canvas!.height = th
			}

			const ctx = canvas!.getContext('2d')!
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			render(ctx, simState, w, h, editor.getCamera())
		}

		editor.on('tick', onTick)
		return () => {
			editor.off('tick', onTick)
		}
	}, [editor])

	return <canvas ref={canvasRef} className="portal-overlay-canvas" />
}

// [3]
function createInitialShapes(editor: Editor) {
	editor.createShapes([
		{
			id: createShapeId(),
			type: 'geo',
			x: 80,
			y: 80,
			props: { w: 160, h: 160, color: 'light-blue', fill: 'semi', geo: 'rectangle' },
		},
		{
			id: createShapeId(),
			type: 'geo',
			x: 360,
			y: 120,
			props: { w: 160, h: 160, color: 'green', fill: 'semi', geo: 'rectangle' },
		},
		{
			id: createShapeId(),
			type: 'geo',
			x: 640,
			y: 80,
			props: { w: 160, h: 160, color: 'red', fill: 'semi', geo: 'rectangle' },
		},
	])
	editor.zoomToFit({ animation: { duration: 300 } })
}

export default function ThreeDPortalsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={{ InFrontOfTheCanvas: PortalOverlay }}
				onMount={(editor: Editor) => {
					simState = createSimState()
					createInitialShapes(editor)
				}}
			/>
		</div>
	)
}

/*
[1]
Module-level simulation state, reset on each mount. Keeps the high-frequency
3D rendering and drop-detection logic outside React's render cycle.

[2]
Full-viewport canvas rendered in front of the tldraw canvas. Each editor tick:
- Syncs portal shapes from the editor (geo shapes >= 80x80)
- Detects non-portal shapes whose center enters a portal's bounds
- Advances drop animations and renders the 3D overlay
pointer-events: none lets all clicks pass through to tldraw.

[3]
Three starter portals at different depths so users can immediately start
dragging shapes into them. Blue = near (z 1.0), green = mid (z 3.0),
red = far (z 6.0).
*/
