import { useLayoutEffect, useRef } from 'react'
import { TLComponents, Tldraw, useEditor, useIsDarkMode, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

/**
 * There's a guide at the bottom of this file!
 */

const components: TLComponents = {
	// [1]
	Background: () => {
		const editor = useEditor()

		// [2]
		const screenBounds = useValue('screenBounds', () => editor.getViewportScreenBounds(), [])
		const devicePixelRatio = useValue('dpr', () => editor.getInstanceState().devicePixelRatio, [])
		const isDarkMode = useIsDarkMode()
		const camera = useValue('camera', () => editor.getCamera(), [])

		const canvas = useRef<HTMLCanvasElement>(null)

		useLayoutEffect(() => {
			if (!canvas.current) return
			
			// [3]
			const canvasW = screenBounds.w * devicePixelRatio
			const canvasH = screenBounds.h * devicePixelRatio
			canvas.current.width = canvasW
			canvas.current.height = canvasH

			const ctx = canvas.current?.getContext('2d')
			if (!ctx) return

			// [4] Clear the canvas and set background color
			ctx.clearRect(0, 0, canvasW, canvasH)
			
			// Set paper background color
			ctx.fillStyle = isDarkMode ? '#1e1e1e' : '#ffffff'
			ctx.fillRect(0, 0, canvasW, canvasH)

			// [5] Set line properties
			const lineSpacing = 32 // spacing between lines in page units
			const marginLeft = 80 // left margin in page units
			
			// Calculate line color
			ctx.strokeStyle = isDarkMode ? '#404040' : '#e0e0e0'
			ctx.lineWidth = 1 * devicePixelRatio

			// [6] Get viewport bounds in page space
			const pageViewportBounds = editor.getViewportPageBounds()

			// Calculate the first and last line positions
			const startPageY = Math.floor(pageViewportBounds.minY / lineSpacing) * lineSpacing
			const endPageY = Math.ceil(pageViewportBounds.maxY / lineSpacing) * lineSpacing
			const numLines = Math.round((endPageY - startPageY) / lineSpacing)

			// [7] Draw horizontal lines
			for (let i = 0; i <= numLines; i++) {
				const pageY = startPageY + i * lineSpacing
				// Convert page-space Y to canvas coordinates
				const canvasY = (pageY + camera.y) * camera.z * devicePixelRatio
				
				// Only draw lines that are visible on screen
				if (canvasY >= -10 && canvasY <= canvasH + 10) {
					ctx.beginPath()
					ctx.moveTo(0, canvasY)
					ctx.lineTo(canvasW, canvasY)
					ctx.stroke()
				}
			}

			// [8] Draw left margin line
			const marginCanvasX = (marginLeft + camera.x) * camera.z * devicePixelRatio
			if (marginCanvasX >= -10 && marginCanvasX <= canvasW + 10) {
				ctx.strokeStyle = isDarkMode ? '#606060' : '#ff9999'
				ctx.lineWidth = 2 * devicePixelRatio
				ctx.beginPath()
				ctx.moveTo(marginCanvasX, 0)
				ctx.lineTo(marginCanvasX, canvasH)
				ctx.stroke()
			}

		}, [screenBounds, camera, devicePixelRatio, editor, isDarkMode])

		// [9]
		return <canvas className="tl-background" ref={canvas} />
	},
}

export default function CustomBackgroundLinesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="custom-background-lines-example"
				components={components}
			/>
		</div>
	)
}

/**
 * This example demonstrates how to create a custom background with horizontal lines,
 * similar to lined paper for writing.
 *
 * 1. We override the Background component to create our custom lined paper background.
 * 2. We track screen bounds, device pixel ratio, dark mode, and camera position to ensure
 *    the background renders correctly at all zoom levels and camera positions.
 * 3. Set canvas dimensions based on screen size and device pixel ratio for crisp rendering.
 * 4. Clear the canvas and set a paper-like background color (white in light mode, dark in dark mode).
 * 5. Define line spacing and margin settings for the lined paper effect.
 * 6. Calculate which lines are visible in the current viewport to optimize rendering.
 * 7. Draw horizontal lines across the canvas at regular intervals, converting from page space
 *    to canvas coordinates using the camera transform.
 * 8. Add a left margin line in a different color (red/pink) like traditional lined paper.
 * 9. Return a canvas element with proper styling for the background layer.
 */