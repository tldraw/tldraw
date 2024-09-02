import { useValue } from '@tldraw/state-react'
import { TLGridType } from '@tldraw/tlschema'
import { exhaustiveSwitchError, invLerp, lerp } from '@tldraw/utils'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useEditor } from '../../hooks/useEditor'
import { useIsDarkMode } from '../../hooks/useIsDarkMode'
import { clamp } from '../../primitives/utils'

/** @public */
export interface TLGridProps {
	x: number
	y: number
	z: number
	size: number
	type: TLGridType
}

const MAJOR_ORDER = 5

/** @public @react */
export function DefaultGrid({ size, type, ...camera }: TLGridProps) {
	const editor = useEditor()

	// [2]
	const screenBounds = useValue('screenBounds', () => editor.getViewportScreenBounds(), [])
	const devicePixelRatio = useValue('dpr', () => editor.getInstanceState().devicePixelRatio, [])
	const isDarkMode = useIsDarkMode()

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

		// [4]
		ctx.clearRect(0, 0, canvasW, canvasH)

		// [5]
		const pageViewportBounds = editor.getViewportPageBounds()

		let minorSize = size
		let sizeInScreenSpace = minorSize * camera.z
		while (sizeInScreenSpace > 30) {
			minorSize = minorSize / MAJOR_ORDER
			sizeInScreenSpace = minorSize * camera.z
		}
		while (sizeInScreenSpace < 3) {
			minorSize = minorSize * MAJOR_ORDER
			sizeInScreenSpace = minorSize * camera.z
		}

		const sizeInCanvasSpace = sizeInScreenSpace * devicePixelRatio

		const minorOpacity = clamp(invLerp(3, 6, sizeInScreenSpace), 0, 1)

		const pageToCanvasX = (x: number) => (x + camera.x) * camera.z * devicePixelRatio
		const pageToCanvasY = (y: number) => (y + camera.y) * camera.z * devicePixelRatio

		const minor: GridSpec = {
			startX: pageToCanvasX(Math.ceil(pageViewportBounds.minX / minorSize) * minorSize),
			startY: pageToCanvasY(Math.ceil(pageViewportBounds.minY / minorSize) * minorSize),
			endX: pageToCanvasX(Math.floor(pageViewportBounds.maxX / minorSize) * minorSize),
			endY: pageToCanvasY(Math.floor(pageViewportBounds.maxY / minorSize) * minorSize),
			rows: Math.round((pageViewportBounds.maxY - pageViewportBounds.minY) / minorSize),
			cols: Math.round((pageViewportBounds.maxX - pageViewportBounds.minX) / minorSize),
			opacity: minorOpacity,
			spacing: minorSize * camera.z * devicePixelRatio,
		}

		const majorSize = minorSize * MAJOR_ORDER

		const major: GridSpec = {
			startX: pageToCanvasX(Math.ceil(pageViewportBounds.minX / majorSize) * majorSize),
			startY: pageToCanvasY(Math.ceil(pageViewportBounds.minY / majorSize) * majorSize),
			endX: pageToCanvasX(Math.floor(pageViewportBounds.maxX / majorSize) * majorSize),
			endY: pageToCanvasY(Math.floor(pageViewportBounds.maxY / majorSize) * majorSize),
			rows: Math.round((pageViewportBounds.maxY - pageViewportBounds.minY) / majorSize),
			cols: Math.round((pageViewportBounds.maxX - pageViewportBounds.minX) / majorSize),
			opacity: 1,
			spacing: majorSize * camera.z * devicePixelRatio,
		}

		const props: DrawStuffProps = {
			ctx,
			camera,
			isDarkMode,
			canvasW,
			canvasH,
			major,
			minor,
		}

		switch (type) {
			case 'grid':
				drawGridStyleGrid(props, true, 3)
				break
			case 'dot':
				drawDotStyleGrid(props)
				break
			case 'line':
				drawGridStyleGrid(props, false, 1)
				break
			case 'iso':
				break
			default:
				exhaustiveSwitchError(type)
		}
	}, [screenBounds, camera, size, devicePixelRatio, editor, isDarkMode, type])

	// [7]
	return useMemo(() => <canvas className="tl-grid" ref={canvas} />, [])
}

interface GridSpec {
	startX: number
	startY: number
	endX: number
	endY: number
	rows: number
	cols: number
	opacity: number
	spacing: number
}

interface DrawStuffProps {
	ctx: CanvasRenderingContext2D
	camera: { x: number; y: number; z: number }
	isDarkMode: boolean
	canvasW: number
	canvasH: number
	major: GridSpec
	minor: GridSpec
}

function drawGridStyleGrid(
	{ ctx, camera, size, isDarkMode, canvasW, canvasH, minor, major }: DrawStuffProps,
	drawColumns: boolean,
	majorLineStrokeWidthMax: number
) {
	// // todo: extract styles from dom like we do for minimap
	// ctx.strokeStyle = isDarkMode ? '#555' : '#BBB'
	// const minorLineOpacity = clamp(invLerp(0.3, 0.6, camera.z), 0, 1)
	// const majorLineStrokeWidth = lerp(
	// 	1,
	// 	majorLineStrokeWidthMax,
	// 	clamp(invLerp(0.3, 0.6, camera.z), 0, 1)
	// )
	// const start = performance.now()
	// if (minorLineOpacity > 0) {
	// 	// draw minor lines first
	// 	ctx.beginPath()
	// 	ctx.globalAlpha = minorLineOpacity
	// 	ctx.lineWidth = 1
	// 	for (let row = 0; row <= numRows; row++) {
	// 		const pageY = startPageY + row * size
	// 		// convert the page-space Y offset into our canvas' coordinate space
	// 		const isMajorLine = approximately(pageY % (size * 10), 0)
	// 		if (isMajorLine) continue
	// 		const canvasY = (pageY + camera.y) * camera.z * devicePixelRatio
	// 		drawLine(ctx, 0, canvasY, canvasW, canvasY)
	// 	}
	// 	for (let col = 0; col <= numCols; col++) {
	// 		const pageX = startPageX + col * size
	// 		// convert the page-space X offset into our canvas' coordinate space
	// 		const isMajorLine = approximately(pageX % (size * 10), 0)
	// 		if (isMajorLine) continue
	// 		const canvasX = (pageX + camera.x) * camera.z * devicePixelRatio
	// 		drawLine(ctx, canvasX, 0, canvasX, canvasH)
	// 	}
	// 	ctx.stroke()
	// }
	// ctx.beginPath()
	// ctx.globalAlpha = 1
	// ctx.lineWidth = majorLineStrokeWidth
	// for (let row = 0; row <= numRows; row++) {
	// 	const pageY = startPageY + row * size
	// 	// convert the page-space Y offset into our canvas' coordinate space
	// 	const canvasY = (pageY + camera.y) * camera.z * devicePixelRatio
	// 	const isMajorLine = approximately(pageY % (size * 10), 0)
	// 	if (!isMajorLine) continue
	// 	drawLine(ctx, 0, canvasY, canvasW, canvasY)
	// }
	// if (!drawColumns) return
	// for (let col = 0; col <= numCols; col++) {
	// 	const pageX = startPageX + col * size
	// 	// convert the page-space X offset into our canvas' coordinate space
	// 	const canvasX = (pageX + camera.x) * camera.z * devicePixelRatio
	// 	const isMajorLine = approximately(pageX % (size * 10), 0)
	// 	if (!isMajorLine) continue
	// 	drawLine(ctx, canvasX, 0, canvasX, canvasH)
	// }
	// ctx.stroke()
	// console.log('drawGridStyleGrid', performance.now() - start)
}

function drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
	ctx.moveTo(x1, y1)
	ctx.lineTo(x2, y2)
}

function drawDotStyleGrid({ camera, ctx, isDarkMode, major, minor }: DrawStuffProps) {
	console.log({ major, minor })
	const majorDotRadius = lerp(2, 4, clamp(invLerp(0.3, 0.6, camera.z), 0, 1))

	const start = performance.now()
	const color = isDarkMode ? '#555' : '#BBB'

	if (minor.opacity > 0) {
		drawDots({
			color,
			opacity: minor.opacity,
			rows: minor.rows,
			cols: minor.cols,
			spacing: minor.spacing,
			ctx,
			radius: 2,
			x: minor.startX,
			y: minor.startY,
		})
	}

	drawDots({
		color,
		opacity: 1,
		radius: majorDotRadius,
		x: major.startX,
		y: major.startY,
		rows: major.rows,
		cols: major.cols,
		spacing: major.spacing,
		ctx,
	})
	console.log('drawDotStyleGrid', performance.now() - start)
}

const transformPath = (path: Path2D, matrix: DOMMatrix) => {
	const copy = new Path2D()
	copy.addPath(path, matrix)
	return copy
}

function drawDots({
	ctx,
	x,
	y,
	radius,
	rows,
	cols,
	spacing,
	color,
	opacity,
}: {
	ctx: CanvasRenderingContext2D
	x: number
	y: number
	radius: number
	rows: number
	cols: number
	spacing: number
	color: string
	opacity: number
}) {
	const MAX_TILE_SIZE = 50
	ctx.fillStyle = color
	ctx.globalAlpha = opacity

	const path = new Path2D()

	for (let row = 0; row < Math.min(rows, MAX_TILE_SIZE); row++) {
		for (let col = 0; col < Math.min(cols, MAX_TILE_SIZE); col++) {
			path.moveTo(x + col * spacing + radius, y + row * spacing)
			path.arc(x + col * spacing, y + row * spacing, radius, 0, Math.PI * 2)
		}
	}
	for (let tileRow = 0; tileRow < Math.ceil(rows / MAX_TILE_SIZE); tileRow++) {
		for (let tileCol = 0; tileCol < Math.ceil(cols / MAX_TILE_SIZE); tileCol++) {
			// translate to the next tile
			const matrix = new DOMMatrix()
			matrix.translateSelf(tileCol * MAX_TILE_SIZE * spacing, tileRow * MAX_TILE_SIZE * spacing)

			ctx.fill(transformPath(path, matrix))
		}
	}
}
