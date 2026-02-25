import { useEffect, useRef } from 'react'
import { Box, TLComponents, Tldraw, Vec, useEditor, useReactor } from 'tldraw'
import 'tldraw/tldraw.css'

const CELL_SIZE = 32
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

	useEffect(() => {
		const cvs = rCanvas.current!
		const rect = cvs.getBoundingClientRect()
		cvs.width = rect.width
		cvs.height = rect.height
	}, [editor])

	useReactor(
		'update fog',
		() => {
			const cells = rVisibility.current
			const shapes = editor.getCurrentPageShapes()
			for (const shape of shapes) {
				const point = editor.getShapePageBounds(shape)!.point
				const geometry = editor.getShapeGeometry(shape)
				const adjustedPoint = Vec.Sub(point, geometry.bounds.point)
				for (let i = 0; i < boxes.length; i++) {
					for (let j = 0; j < boxes[i].length; j++) {
						const box = boxes[i][j]
						box.translate(Vec.Neg(adjustedPoint))
						if (geometry.bounds.collides(box)) {
							cells[i][j] = true
						}
						box.translate(adjustedPoint)
					}
				}
			}
			const cvs = rCanvas.current!
			const ctx = cvs.getContext('2d')!

			cvs.style.filter = `blur(${editor.getCamera().z * 15}px)`

			ctx.resetTransform()
			const camera = editor.getCamera()

			ctx.clearRect(0, 0, cvs.width, cvs.height)
			ctx.fillStyle = 'rgba(0,0,0,0.9)'
			ctx.fillRect(0, 0, cvs.width, cvs.height)

			ctx.translate(100, 100)
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
	InFrontOfTheCanvas: Fog,
}

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" components={components} />
		</div>
	)
}
