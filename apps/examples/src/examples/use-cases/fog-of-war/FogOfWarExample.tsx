import { useEffect, useRef } from 'react'
import { Box, TLComponents, Tldraw, useEditor, useReactor } from 'tldraw'
import 'tldraw/tldraw.css'

const CELL_SIZE = 32
const COUNT = 100
// The canvas is oversized by this much on every side so the blur doesn't fade at the edges
const BLEED = 100

// [1]
const boxes: Box[][] = []
const cells: boolean[][] = []
for (let i = 0; i < COUNT; i++) {
	cells[i] = []
	boxes[i] = []
	for (let j = 0; j < COUNT; j++) {
		cells[i].push(false)
		boxes[i].push(
			new Box((i - COUNT / 2) * CELL_SIZE, (j - COUNT / 2) * CELL_SIZE, CELL_SIZE, CELL_SIZE)
		)
	}
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

	// [2]
	useReactor(
		'update fog',
		() => {
			for (const shape of editor.getCurrentPageShapes()) {
				const bounds = editor.getShapePageBounds(shape)
				if (!bounds) continue
				for (let i = 0; i < boxes.length; i++) {
					for (let j = 0; j < boxes[i].length; j++) {
						if (bounds.collides(boxes[i][j])) {
							cells[i][j] = true
						}
					}
				}
			}

			// [3]
			const cvs = rCanvas.current!
			const ctx = cvs.getContext('2d')!
			const camera = editor.getCamera()

			cvs.style.filter = `blur(${camera.z * 15}px)`

			ctx.resetTransform()
			ctx.clearRect(0, 0, cvs.width, cvs.height)
			ctx.fillStyle = 'rgba(0,0,0,0.9)'
			ctx.fillRect(0, 0, cvs.width, cvs.height)

			ctx.translate(BLEED, BLEED)
			ctx.scale(camera.z, camera.z)
			ctx.translate(camera.x, camera.y)

			for (let i = 0; i < boxes.length; i++) {
				for (let j = 0; j < boxes[i].length; j++) {
					if (!cells[i][j]) continue
					const box = boxes[i][j]
					ctx.clearRect(box.x, box.y, box.width, box.height)
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
				top: -BLEED,
				left: -BLEED,
				width: `calc(100% + ${BLEED * 2}px)`,
				height: `calc(100% + ${BLEED * 2}px)`,
				pointerEvents: 'none',
			}}
		/>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: Fog,
}

export default function FogOfWarExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="fog-of-war-example" components={components} />
		</div>
	)
}

/*
[1]
The fog is a fixed grid of cells in page space centered on the origin. Once a cell has been
revealed it stays revealed, so the grid lives at module level rather than in React state and
survives re-renders (but not a page reload).

[2]
`useReactor` runs the callback whenever any signal it read changes: shapes, their bounds,
and the camera. Any cell that overlaps a shape's page bounds is marked as revealed.

[3]
The HTML canvas sits in the `InFrontOfTheCanvas` slot in screen space, so we apply the
tldraw camera transform (scale by zoom, then translate) before clearing the revealed cells.
The blur radius is scaled with the zoom so the fog edge looks the same at every zoom level.
*/
