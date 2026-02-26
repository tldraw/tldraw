import { useEffect, useRef } from 'react'
import { Editor, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { type SimState, createSimState, render, requestUnfold, startFold, tick } from './simulation'
import './underground-canvas-clipboard.css'

// [1]
let simState: SimState = createSimState()

// [2]
function UndergroundOverlay() {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		function onTick() {
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

	// [3]
	useEffect(() => {
		const container = editor.getContainer()

		function onKeyDown(e: KeyboardEvent) {
			const mod = e.metaKey || e.ctrlKey

			// Copy — capture phase, do NOT prevent default
			if (mod && e.key === 'c' && !e.shiftKey) {
				const selectedIds = editor.getSelectedShapeIds()
				if (selectedIds.length === 0) return

				const content = editor.getContentFromCurrentPage(selectedIds)
				if (!content) return

				const bounds = editor.getSelectionRotatedPageBounds()
				if (!bounds) return

				startFold(simState, content, {
					x: bounds.x,
					y: bounds.y,
					w: bounds.w,
					h: bounds.h,
				})
			}

			// Paste — only intercept if we have stored content
			if (mod && e.key === 'v' && !e.shiftKey) {
				if (simState.clipboardContent) {
					e.preventDefault()
					e.stopPropagation()

					const point = editor.inputs.currentPagePoint
					const delivered = requestUnfold(simState, point.x, point.y)

					if (delivered) {
						// Place content after animation completes
						const content = simState.clipboardContent
						const animCheckInterval = setInterval(() => {
							const anim = simState.unfoldAnimations.find((a) => a.content === content && !a.placed)
							if (anim && anim.done) {
								anim.placed = true
								clearInterval(animCheckInterval)
								editor.putContentOntoCurrentPage(anim.content, {
									point: { x: anim.x, y: anim.y },
									select: true,
								})
							}
						}, 16)
						// Safety timeout
						setTimeout(() => clearInterval(animCheckInterval), 5000)
					}
				}
				// If no stored content, don't prevent default — normal paste proceeds
			}
		}

		container.addEventListener('keydown', onKeyDown, { capture: true })
		return () => {
			container.removeEventListener('keydown', onKeyDown, { capture: true })
		}
	}, [editor])

	return <canvas ref={canvasRef} className="underground-clipboard-canvas" />
}

// [4]
export default function UndergroundCanvasClipboardExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={{ InFrontOfTheCanvas: UndergroundOverlay }}
				onMount={(editor: Editor) => {
					simState = createSimState()
				}}
			/>
		</div>
	)
}

/*
[1]
Module-level simulation state, reset on each mount. Keeps high-frequency
updates outside React's render cycle.

[2]
Full-viewport canvas rendered in front of the tldraw canvas. Each editor tick
advances the simulation and redraws with the camera transform applied for
zoom and pan support. pointer-events: none lets clicks pass through.

[3]
Capture-phase keydown listener intercepts Cmd/Ctrl+C and Cmd/Ctrl+V.
Copy: captures content and starts fold animation without blocking tldraw's copy.
Paste: if we have stored content, prevents default and starts unfold animation;
otherwise falls through to normal tldraw paste for external clipboard content.

[4]
Main component keeps the full tldraw UI so users can create and select shapes.
Only the InFrontOfTheCanvas component is overridden for the underground overlay.
*/
