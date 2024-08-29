import { useValue } from '@tldraw/state-react'
import { TLGridType } from '@tldraw/tlschema'
import { exhaustiveSwitchError, invLerp, lerp } from '@tldraw/utils'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useEditor } from '../../hooks/useEditor'
import { useIsDarkMode } from '../../hooks/useIsDarkMode'
import { approximately, clamp } from '../../primitives/utils'

/** @public */
export interface TLGridProps {
	x: number
	y: number
	z: number
	size: number
	type: TLGridType
}

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

		const startPageX = Math.ceil(pageViewportBounds.minX / size) * size
		const startPageY = Math.ceil(pageViewportBounds.minY / size) * size
		const endPageX = Math.floor(pageViewportBounds.maxX / size) * size
		const endPageY = Math.floor(pageViewportBounds.maxY / size) * size
		const numRows = Math.round((endPageY - startPageY) / size)
		const numCols = Math.round((endPageX - startPageX) / size)

		const props = {
			ctx,
			camera,
			size,
			isDarkMode,
			numRows,
			numCols,
			startPageX,
			startPageY,
			canvasW,
			canvasH,
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

interface DrawStuffProps {
	ctx: CanvasRenderingContext2D
	camera: { x: number; y: number; z: number }
	size: number
	isDarkMode: boolean
	numRows: number
	numCols: number
	startPageX: number
	startPageY: number
	canvasW: number
	canvasH: number
}

function drawGridStyleGrid(
	{
		ctx,
		camera,
		size,
		isDarkMode,
		numRows,
		numCols,
		startPageX,
		startPageY,
		canvasW,
		canvasH,
	}: DrawStuffProps,
	drawColumns: boolean,
	majorLineStrokeWidthMax: number
) {
	// todo: extract styles from dom like we do for minimap
	ctx.strokeStyle = isDarkMode ? '#555' : '#BBB'
	const minorLineOpacity = clamp(invLerp(0.3, 0.6, camera.z), 0, 1)
	const majorLineStrokeWidth = lerp(
		1,
		majorLineStrokeWidthMax,
		clamp(invLerp(0.3, 0.6, camera.z), 0, 1)
	)

	// [6]
	for (let row = 0; row <= numRows; row++) {
		const pageY = startPageY + row * size
		// convert the page-space Y offset into our canvas' coordinate space
		const canvasY = (pageY + camera.y) * camera.z * devicePixelRatio
		const isMajorLine = approximately(pageY % (size * 10), 0)
		if (minorLineOpacity === 0 && !isMajorLine) continue
		ctx.globalAlpha = isMajorLine ? 1 : minorLineOpacity
		drawLine(ctx, 0, canvasY, canvasW, canvasY, isMajorLine ? majorLineStrokeWidth : 1)
	}
	if (!drawColumns) return
	for (let col = 0; col <= numCols; col++) {
		const pageX = startPageX + col * size
		// convert the page-space X offset into our canvas' coordinate space
		const canvasX = (pageX + camera.x) * camera.z * devicePixelRatio
		const isMajorLine = approximately(pageX % (size * 10), 0)
		if (minorLineOpacity === 0 && !isMajorLine) continue
		ctx.globalAlpha = isMajorLine ? 1 : minorLineOpacity
		drawLine(ctx, canvasX, 0, canvasX, canvasH, isMajorLine ? majorLineStrokeWidth : 1)
	}
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

function drawDotStyleGrid({
	camera,
	ctx,
	isDarkMode,
	numCols,
	numRows,
	size,
	startPageX,
	startPageY,
}: DrawStuffProps) {
	const minorDotOpacity = clamp(invLerp(0.5, 1, camera.z), 0, 1)
	const majorDotRadius = lerp(2, 4, clamp(invLerp(0.3, 0.6, camera.z), 0, 1))
	ctx.fillStyle = isDarkMode ? '#555' : '#BBB'

	const start = performance.now()
	let iters = 0
	for (let row = 0; row <= numRows; row++) {
		const pageY = startPageY + row * size
		const canvasY = (pageY + camera.y) * camera.z * devicePixelRatio
		const isMajorRowDot = approximately(pageY % (size * 10), 0)
		if (minorDotOpacity === 0 && !isMajorRowDot) continue
		for (let col = 0; col <= numCols; col++) {
			iters++
			const pageX = startPageX + col * size
			const isMajorDot = isMajorRowDot && approximately(pageX % (size * 10), 0)
			const canvasX = (pageX + camera.x) * camera.z * devicePixelRatio
			ctx.globalAlpha = isMajorDot ? 1 : minorDotOpacity
			if (minorDotOpacity === 0 && !isMajorDot) continue
			drawDot(ctx, canvasX, canvasY, isMajorDot ? majorDotRadius : 2)
		}
	}

	console.log('drawDotStyleGrid', performance.now() - start, iters)
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
	// draw a rect instead
	ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
}
