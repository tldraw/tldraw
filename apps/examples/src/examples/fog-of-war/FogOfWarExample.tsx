import { useRef } from 'react'
import { Box, TLComponents, Tldraw, useEditor, useReactor } from 'tldraw'
import 'tldraw/tldraw.css'

const CELL_SIZE = 100
const COUNT = 100

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
	const rVisibility = useRef<boolean[][]>(cells)
	const editor = useEditor()

	useReactor(
		'update fog',
		() => {
			const cells = rVisibility.current
			const bounds = editor.getCurrentPageShapes().map((s) => editor.getShapePageBounds(s)!)
			for (let i = 0; i < boxes.length; i++) {
				for (let j = 0; j < boxes[i].length; j++) {
					const box = boxes[i][j]
					for (const bound of bounds) {
						if (bound.includes(box)) {
							cells[i][j] = true
						}
					}
				}
			}
			const cvs = rCanvas.current!
			const ctx = cvs.getContext('2d')!

			ctx.clearRect(0, 0, cvs.width, cvs.height)
			ctx.fillStyle = 'rgba(0,0,0,0.5)'
			ctx.fillRect(0, 0, cvs.width, cvs.height)

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
				zIndex: 999999,
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
			}}
		/>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: Fog,
}

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" components={components} />
		</div>
	)
}
