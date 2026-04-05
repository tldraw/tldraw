import { useQuickReactor } from '@tldraw/state-react'
import { memo, useRef } from 'react'
import { useEditor } from '../../hooks/useEditor'

/** @internal @react */
export const CanvasOverlays = memo(function CanvasOverlays() {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useQuickReactor(
		'canvas overlays render',
		() => {
			const canvas = canvasRef.current
			if (!canvas) return

			const ctx = canvas.getContext('2d')
			if (!ctx) return

			const { w, h } = editor.getViewportScreenBounds()
			const dpr = editor.getInstanceState().devicePixelRatio
			const { x: cx, y: cy, z: zoom } = editor.getCamera()

			const canvasWidth = Math.ceil(w * dpr)
			const canvasHeight = Math.ceil(h * dpr)

			if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
				canvas.width = canvasWidth
				canvas.height = canvasHeight
				canvas.style.width = `${w}px`
				canvas.style.height = `${h}px`
			}

			ctx.resetTransform()
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// Apply DPR scaling and camera transform to get into page space
			ctx.scale(dpr, dpr)
			ctx.scale(zoom, zoom)
			ctx.translate(cx, cy)

			// Render all active overlay utils
			for (const util of editor.overlays._overlayUtils.values()) {
				if (!util.isActive()) continue
				const overlays = util.getOverlays()
				if (overlays.length === 0) continue
				ctx.save()
				util.render(ctx, overlays)
				ctx.restore()
			}
		},
		[editor]
	)

	return <canvas ref={canvasRef} className="tl-canvas-overlays" />
})
