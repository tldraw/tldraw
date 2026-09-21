import { useLayoutEffect, useRef } from 'react'
import { TLComponents, Tldraw, approximately, useColorMode, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const components: TLComponents = {
	// [1]
	Grid: ({ size, ...camera }) => {
		const editor = useEditor()

		// [2]
		const screenBounds = useValue('screenBounds', () => editor.getViewportScreenBounds(), [editor])
		const devicePixelRatio = useValue('dpr', () => editor.getInstanceState().devicePixelRatio, [
			editor,
		])
		const isDarkMode = useColorMode() === 'dark'

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

			ctx.clearRect(0, 0, canvasW, canvasH)

			// [4]
			const pageViewportBounds = editor.getViewportPageBounds()

			const startPageX = Math.ceil(pageViewportBounds.minX / size) * size
			const startPageY = Math.ceil(pageViewportBounds.minY / size) * size
			const endPageX = Math.floor(pageViewportBounds.maxX / size) * size
			const endPageY = Math.floor(pageViewportBounds.maxY / size) * size
			const numRows = Math.round((endPageY - startPageY) / size)
			const numCols = Math.round((endPageX - startPageX) / size)

			ctx.strokeStyle = isDarkMode ? '#555' : '#BBB'

			// [5]
			for (let row = 0; row <= numRows; row++) {
				const pageY = startPageY + row * size
				// convert the page-space Y offset into our canvas' coordinate space
				const canvasY = (pageY + camera.y) * camera.z * devicePixelRatio
				const isMajorLine = approximately(pageY % (size * 10), 0)
				drawLine(ctx, 0, canvasY, canvasW, canvasY, isMajorLine ? 3 : 1)
			}
			for (let col = 0; col <= numCols; col++) {
				const pageX = startPageX + col * size
				// convert the page-space X offset into our canvas' coordinate space
				const canvasX = (pageX + camera.x) * camera.z * devicePixelRatio
				const isMajorLine = approximately(pageX % (size * 10), 0)
				drawLine(ctx, canvasX, 0, canvasX, canvasH, isMajorLine ? 3 : 1)
			}
		}, [screenBounds, camera, size, devicePixelRatio, editor, isDarkMode])

		// [6]
		return <canvas className="tl-grid" ref={canvas} />
	},
}

export default function CustomGridExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="custom-grid-example"
				components={components}
				onMount={(e) => {
					e.updateInstanceState({ isGridMode: true })
				}}
			/>
		</div>
	)
}

function drawLine(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	width: number
) {
	ctx.beginPath()
	ctx.moveTo(x1, y1)
	ctx.lineTo(x2, y2)
	ctx.lineWidth = width
	ctx.stroke()
}

/*
[1]
To add a custom grid, override the `Grid` component. It receives the camera position and zoom
along with the grid size in page space, and re-renders whenever the camera moves.

[2]
Besides the camera, the grid also needs to redraw when the screen bounds change, when the device
pixel ratio changes, or when the color mode changes. `useValue` and `useColorMode` subscribe to
those values so the component re-renders when they change.

[3]
To avoid pixelation we render at the device's actual resolution, so the canvas size is scaled by
the device pixel ratio.

[4]
Calculate the first and last grid lines visible in the viewport, in page space, so we only draw
the lines that are actually on screen.

[5]
Convert each page-space line position into canvas pixels using the camera and device pixel ratio.
Major lines are drawn every 10 grid units.

[6]
The `tl-grid` class is important for correct positioning and pointer-event handling.
*/
