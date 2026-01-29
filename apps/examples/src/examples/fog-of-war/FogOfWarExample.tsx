import { useEffect, useRef } from 'react'
import { TLComponents, Tldraw, useEditor, useReactor } from 'tldraw'
import 'tldraw/tldraw.css'

const CELL_SIZE = 32

/**
 * A sparse map storing which cells have been revealed.
 * Keys are "i,j" strings where i and j are cell indices in an infinite grid.
 */
const revealedCells = new Map<string, boolean>()

function getCellKey(i: number, j: number): string {
	return `${i},${j}`
}

function getCellIndices(x: number, y: number): [number, number] {
	return [Math.floor(x / CELL_SIZE), Math.floor(y / CELL_SIZE)]
}

export function Fog() {
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const editor = useEditor()

	useEffect(() => {
		const cvs = rCanvas.current!
		const rect = cvs.getBoundingClientRect()
		cvs.width = rect.width
		cvs.height = rect.height
	}, [editor])

	useReactor(
		'update fog',
		() => {
			const shapes = editor.getCurrentPageShapes()

			// Mark cells as revealed based on shape bounds
			for (const shape of shapes) {
				const pageBounds = editor.getShapePageBounds(shape)
				if (!pageBounds) continue

				// Get the cell range that this shape covers
				const [minI, minJ] = getCellIndices(pageBounds.minX, pageBounds.minY)
				const [maxI, maxJ] = getCellIndices(pageBounds.maxX, pageBounds.maxY)

				// Mark all cells in the range as revealed
				for (let i = minI; i <= maxI; i++) {
					for (let j = minJ; j <= maxJ; j++) {
						revealedCells.set(getCellKey(i, j), true)
					}
				}
			}

			const cvs = rCanvas.current!
			const ctx = cvs.getContext('2d')!
			const camera = editor.getCamera()

			// Get viewport bounds in page space
			const viewportBounds = editor.getViewportPageBounds()

			// Calculate the cell range visible in the viewport (with some padding for blur)
			const padding = 100 / camera.z // padding in page space for blur effect
			const [startI, startJ] = getCellIndices(
				viewportBounds.minX - padding,
				viewportBounds.minY - padding
			)
			const [endI, endJ] = getCellIndices(
				viewportBounds.maxX + padding,
				viewportBounds.maxY + padding
			)

			// Set blur based on zoom level
			cvs.style.filter = `blur(${camera.z * 15}px)`

			ctx.resetTransform()
			ctx.clearRect(0, 0, cvs.width, cvs.height)

			// Fill with fog
			ctx.fillStyle = 'rgba(0,0,0,0.9)'
			ctx.fillRect(0, 0, cvs.width, cvs.height)

			// Apply camera transform (offset by 100 for the canvas padding)
			ctx.translate(100, 100)
			ctx.scale(camera.z, camera.z)
			ctx.translate(camera.x, camera.y)

			// Clear revealed cells within the viewport
			for (let i = startI; i <= endI; i++) {
				for (let j = startJ; j <= endJ; j++) {
					if (revealedCells.get(getCellKey(i, j))) {
						ctx.clearRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE)
					}
				}
			}
		},
		[editor]
	)

	return (
		<canvas
			ref={rCanvas}
			style={{
				position: 'absolute',
				top: -100,
				left: -100,
				width: 'calc(100% + 200px)',
				height: 'calc(100% + 200px)',
				WebkitFilter: 'blur(15px)',
				filter: 'blur(15px)',
				pointerEvents: 'none',
			}}
		/>
	)
}

const components: TLComponents = {
	// Use OnTheCanvas instead of InFrontOfTheCanvas so the fog doesn't cover the UI
	OnTheCanvas: Fog,
}

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" components={components} />
		</div>
	)
}
