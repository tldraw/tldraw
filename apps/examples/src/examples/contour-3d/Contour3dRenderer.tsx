import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { Box, Mat, useEditor, useReactor, type TLShape } from 'tldraw'
import {
	buildHeightfield,
	CONTOUR_LINE_COLOR,
	extractContourShapes,
	flattenNodes,
	getTerrainColorRGB,
	projectPoint,
	projectPolygon,
	type Heightfield,
	type ProjectionParams,
} from './contour-utils'

const SELECTION_COLOR = '#3b82f6'
const FOCAL_LENGTH = 800

// Directional light from upper-left
const LIGHT_X = -0.4
const LIGHT_Y = -0.6
const LIGHT_Z = 0.65
const LIGHT_LEN = Math.sqrt(LIGHT_X ** 2 + LIGHT_Y ** 2 + LIGHT_Z ** 2)
const LX = LIGHT_X / LIGHT_LEN
const LY = LIGHT_Y / LIGHT_LEN
const LZ = LIGHT_Z / LIGHT_LEN

const HANDLE_HIT_RADIUS_PX = 10

type DragMode =
	| { type: 'none' }
	| { type: 'move'; lastScreenX: number; lastScreenY: number }
	| {
			type: 'resize'
			cornerIndex: number
			shapeId: TLShape['id']
			anchor: { x: number; y: number }
			initialBoundsW: number
			initialBoundsH: number
			initialShape: TLShape
			initialBounds: Box
			initialPageTransform: Mat
	  }
	| {
			type: 'rotate'
			shapeId: TLShape['id']
			center: { x: number; y: number }
			initialAngle: number
			initialRotation: number
	  }

interface ProjectedSelectionData {
	shapeId: string
	projectedCorners: { x: number; y: number }[]
	pageCorners: { x: number; y: number }[]
	rotationHandle: { x: number; y: number }
}

export interface Contour3dState {
	isSculpting: boolean
	setIsSculpting: (v: boolean) => void
	elevation: number
	setElevation: (v: number) => void
	tiltDeg: number
	setTiltDeg: (v: number) => void
}

export const Contour3dContext = createContext<Contour3dState | null>(null)

export function useContour3d() {
	const ctx = useContext(Contour3dContext)
	if (!ctx) throw new Error('useContour3d must be used within Contour3dProvider')
	return ctx
}

/** Winding-number point-in-polygon for projected {x, y} arrays. */
function hitTestProjectedPolygon(px: number, py: number, polygon: { x: number; y: number }[]) {
	let winding = 0
	const n = polygon.length
	for (let i = 0; i < n; i++) {
		const a = polygon[i]
		const b = polygon[(i + 1) % n]
		if (a.y <= py) {
			if (b.y > py && (b.x - a.x) * (py - a.y) - (px - a.x) * (b.y - a.y) > 0) winding++
		} else {
			if (b.y <= py && (b.x - a.x) * (py - a.y) - (px - a.x) * (b.y - a.y) < 0) winding--
		}
	}
	return winding !== 0
}

interface ProjectedShape {
	id: string
	polygon: { x: number; y: number }[]
	depth: number
}

export function Contour3dOverlay() {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)

	const { isSculpting, elevation, tiltDeg } = useContour3d()

	// Cache heightfield reactively (rebuilt when shapes change)
	const rHeightfield = useRef<Heightfield | null>(null)
	const rHasShapes = useRef(false)
	// Cache projected shape polygons for hit testing
	const rProjectedShapes = useRef<ProjectedShape[]>([])
	// Cache projected selection data for hit testing handles
	const rProjectedSelection = useRef<ProjectedSelectionData[]>([])

	useReactor(
		'build heightfield',
		() => {
			const contours = extractContourShapes(editor)
			rHasShapes.current = contours.length > 0
			if (contours.length > 0) {
				rHeightfield.current = buildHeightfield(contours)
			} else {
				rHeightfield.current = null
			}
		},
		[editor]
	)

	// Hide tldraw shapes and overlays when sculpting
	useEffect(() => {
		if (!isSculpting) return
		const container = editor.getContainer()
		const style = document.createElement('style')
		style.textContent = `.tl-shapes { opacity: 0 !important; }`
		document.head.appendChild(style)

		// Directly hide the overlays container (selection bounds, indicators, etc.)
		const overlays = container.querySelector('.tl-overlays') as HTMLElement | null
		if (overlays) overlays.style.visibility = 'hidden'

		return () => {
			document.head.removeChild(style)
			if (overlays) overlays.style.visibility = ''
		}
	}, [isSculpting, editor])

	// Canvas sizing
	useEffect(() => {
		const canvas = rCanvas.current
		if (!canvas || !isSculpting) return

		function resize() {
			if (!canvas) return
			const dpr = window.devicePixelRatio || 1
			const rect = canvas.getBoundingClientRect()
			canvas.width = rect.width * dpr
			canvas.height = rect.height * dpr
		}

		resize()
		window.addEventListener('resize', resize)
		return () => window.removeEventListener('resize', resize)
	}, [isSculpting])

	// Main render function
	const render = useCallback(() => {
		const canvas = rCanvas.current
		if (!canvas) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const dpr = window.devicePixelRatio || 1
		ctx.resetTransform()
		ctx.clearRect(0, 0, canvas.width, canvas.height)
		ctx.scale(dpr, dpr)

		const hf = rHeightfield.current
		if (!hf) return

		const { depths, gridW, gridH, minX, minY, cellSize, roots } = hf

		// Apply camera
		const camera = editor.getCamera()
		ctx.save()
		ctx.scale(camera.z, camera.z)
		ctx.translate(camera.x, camera.y)

		// Compute terrain center for projection
		const terrainW = (gridW - 1) * cellSize
		const terrainH = (gridH - 1) * cellSize
		const cx = minX + terrainW / 2
		const cy = minY + terrainH / 2

		const tiltRad = (tiltDeg * Math.PI) / 180
		const params: ProjectionParams = {
			centerX: cx,
			centerY: cy,
			tiltAngle: tiltRad,
			focalLength: FOCAL_LENGTH,
		}

		// Pre-compute projected grid points
		const projX = new Float64Array(gridW * gridH)
		const projY = new Float64Array(gridW * gridH)

		for (let gy = 0; gy < gridH; gy++) {
			for (let gx = 0; gx < gridW; gx++) {
				const idx = gy * gridW + gx
				const wx = minX + gx * cellSize
				const wy = minY + gy * cellSize
				const h = depths[idx] * elevation
				const p = projectPoint(wx, wy, h, params)
				projX[idx] = p.x
				projY[idx] = p.y
			}
		}

		// Render grid cells back to front (low gy = far/top of canvas, render first)
		for (let gy = 0; gy < gridH - 1; gy++) {
			for (let gx = 0; gx < gridW - 1; gx++) {
				const i00 = gy * gridW + gx
				const i10 = gy * gridW + gx + 1
				const i01 = (gy + 1) * gridW + gx
				const i11 = (gy + 1) * gridW + gx + 1

				const d00 = depths[i00]
				const d10 = depths[i10]
				const d01 = depths[i01]
				const d11 = depths[i11]

				// Skip cells entirely outside terrain
				if (d00 === 0 && d10 === 0 && d01 === 0 && d11 === 0) continue

				const h00 = d00 * elevation
				const h10 = d10 * elevation
				const h01 = d01 * elevation
				const h11 = d11 * elevation

				// Surface normal in world space (cross product of grid edges)
				// e1 = (cellSize, 0, h10-h00), e2 = (0, cellSize, h01-h00)
				// normal = (-(h10-h00), -(h01-h00), cellSize)
				let nx = -(h10 - h00)
				let ny = -(h01 - h00)
				let nz = cellSize
				const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz)
				nx /= nLen
				ny /= nLen
				nz /= nLen

				const diffuse = Math.max(0, nx * LX + ny * LY + nz * LZ)
				const brightness = 0.35 + 0.65 * diffuse

				const avgD = (d00 + d10 + d01 + d11) / 4
				const [r, g, b] = getTerrainColorRGB(avgD)

				ctx.beginPath()
				ctx.moveTo(projX[i00], projY[i00])
				ctx.lineTo(projX[i10], projY[i10])
				ctx.lineTo(projX[i11], projY[i11])
				ctx.lineTo(projX[i01], projY[i01])
				ctx.closePath()
				ctx.fillStyle = `rgb(${Math.round(r * brightness)},${Math.round(g * brightness)},${Math.round(b * brightness)})`
				ctx.fill()
			}
		}

		// Draw contour lines on top of the terrain
		const allNodes = flattenNodes(roots)
		let maxDepth = 0
		for (const node of allNodes) {
			maxDepth = Math.max(maxDepth, node.depth)
		}

		ctx.strokeStyle = CONTOUR_LINE_COLOR
		ctx.lineWidth = 1.5
		const projectedShapes: ProjectedShape[] = []
		for (const node of allNodes) {
			const h = maxDepth > 0 ? (node.depth / maxDepth) * elevation : 0
			const { projected } = projectPolygon(node.shape.vertices, h, params)
			projectedShapes.push({ id: node.shape.id, polygon: projected, depth: node.depth })
			ctx.beginPath()
			ctx.moveTo(projected[0].x, projected[0].y)
			for (let i = 1; i < projected.length; i++) {
				ctx.lineTo(projected[i].x, projected[i].y)
			}
			ctx.closePath()
			ctx.stroke()
		}
		// Sort deepest first so hit testing picks the topmost (highest depth) shape
		rProjectedShapes.current = projectedShapes.sort((a, b) => b.depth - a.depth)

		// Draw 3D projected selection indicators
		const selectedIds = editor.getSelectedShapeIds()
		const projectedSelection: ProjectedSelectionData[] = []
		if (selectedIds.length > 0) {
			const selectedSet = new Set<string>(selectedIds)
			ctx.strokeStyle = SELECTION_COLOR
			ctx.lineWidth = 2.5
			const handleSize = 4 / camera.z
			for (const node of allNodes) {
				if (!selectedSet.has(node.shape.id)) continue
				const h = maxDepth > 0 ? (node.depth / maxDepth) * elevation : 0

				// Compute bounding box of the shape's vertices in page space
				let bMinX = Infinity,
					bMinY = Infinity,
					bMaxX = -Infinity,
					bMaxY = -Infinity
				for (const v of node.shape.vertices) {
					if (v.x < bMinX) bMinX = v.x
					if (v.y < bMinY) bMinY = v.y
					if (v.x > bMaxX) bMaxX = v.x
					if (v.y > bMaxY) bMaxY = v.y
				}

				// Page-space corners: TL, TR, BR, BL
				const pageCorners = [
					{ x: bMinX, y: bMinY },
					{ x: bMaxX, y: bMinY },
					{ x: bMaxX, y: bMaxY },
					{ x: bMinX, y: bMaxY },
				]

				// Project bounding box corners
				const corners = [
					projectPoint(bMinX, bMinY, h, params),
					projectPoint(bMaxX, bMinY, h, params),
					projectPoint(bMaxX, bMaxY, h, params),
					projectPoint(bMinX, bMaxY, h, params),
				]

				// Draw projected bounding box
				ctx.beginPath()
				ctx.moveTo(corners[0].x, corners[0].y)
				for (let i = 1; i < corners.length; i++) {
					ctx.lineTo(corners[i].x, corners[i].y)
				}
				ctx.closePath()
				ctx.stroke()

				// Draw corner handles
				ctx.fillStyle = '#ffffff'
				for (const c of corners) {
					ctx.beginPath()
					ctx.rect(c.x - handleSize, c.y - handleSize, handleSize * 2, handleSize * 2)
					ctx.fill()
					ctx.stroke()
				}

				// Draw rotation handle
				const topMidX = (corners[0].x + corners[1].x) / 2
				const topMidY = (corners[0].y + corners[1].y) / 2
				const edgeDx = corners[1].x - corners[0].x
				const edgeDy = corners[1].y - corners[0].y
				const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy)
				let rotHandle: { x: number; y: number }
				if (edgeLen > 0.001) {
					// Compute outward normal of the top edge
					const quadCtrX = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4
					const quadCtrY = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4
					const outX = topMidX - quadCtrX
					const outY = topMidY - quadCtrY
					// Two perpendicular candidates
					const n1x = -edgeDy / edgeLen
					const n1y = edgeDx / edgeLen
					// Pick the one pointing outward (away from quad center)
					let normalX: number, normalY: number
					if (n1x * outX + n1y * outY > 0) {
						normalX = n1x
						normalY = n1y
					} else {
						normalX = edgeDy / edgeLen
						normalY = -edgeDx / edgeLen
					}
					const offset = 20 / camera.z
					rotHandle = {
						x: topMidX + normalX * offset,
						y: topMidY + normalY * offset,
					}
				} else {
					rotHandle = { x: topMidX, y: topMidY - 20 / camera.z }
				}

				// Draw line from top-mid to rotation handle
				ctx.beginPath()
				ctx.moveTo(topMidX, topMidY)
				ctx.lineTo(rotHandle.x, rotHandle.y)
				ctx.stroke()

				// Draw rotation handle circle
				const rotHandleRadius = 4 / camera.z
				ctx.beginPath()
				ctx.arc(rotHandle.x, rotHandle.y, rotHandleRadius, 0, Math.PI * 2)
				ctx.fillStyle = '#ffffff'
				ctx.fill()
				ctx.stroke()

				// Cache selection data for hit testing
				projectedSelection.push({
					shapeId: node.shape.id,
					projectedCorners: corners,
					pageCorners,
					rotationHandle: rotHandle,
				})
			}
		}
		rProjectedSelection.current = projectedSelection

		ctx.restore()
	}, [editor, elevation, tiltDeg])

	// Intercept pointer events to select, drag, resize, and rotate shapes via their 3D projected positions
	useEffect(() => {
		if (!isSculpting) return

		const container = editor.getContainer()
		let dragState: DragMode = { type: 'none' }

		function handlePointerDown(e: PointerEvent) {
			// Don't intercept clicks on UI elements
			if ((e.target as HTMLElement).closest('.tlui-layout')) return

			const canvas = rCanvas.current
			if (!canvas) return

			const rect = canvas.getBoundingClientRect()
			const camera = editor.getCamera()

			// Convert screen position to page space (inverse of the canvas render transform)
			const pageX = (e.clientX - rect.left) / camera.z - camera.x
			const pageY = (e.clientY - rect.top) / camera.z - camera.y

			const hitRadius = HANDLE_HIT_RADIUS_PX / camera.z

			// Check selection handles (rotation, then corners) before shape polygons
			for (const sel of rProjectedSelection.current) {
				// 1. Check rotation handle
				const rdx = pageX - sel.rotationHandle.x
				const rdy = pageY - sel.rotationHandle.y
				if (Math.sqrt(rdx * rdx + rdy * rdy) < hitRadius) {
					const shape = editor.getShape(sel.shapeId as any)
					if (!shape) continue

					// Center of page-space bounding box
					const centerX = (sel.pageCorners[0].x + sel.pageCorners[2].x) / 2
					const centerY = (sel.pageCorners[0].y + sel.pageCorners[2].y) / 2

					const initialAngle = Math.atan2(pageY - centerY, pageX - centerX)

					editor.markHistoryStoppingPoint('rotate')
					dragState = {
						type: 'rotate',
						shapeId: shape.id,
						center: { x: centerX, y: centerY },
						initialAngle,
						initialRotation: shape.rotation,
					}
					document.body.style.cursor = 'grabbing'
					e.stopPropagation()
					e.preventDefault()
					return
				}

				// 2. Check corner handles
				for (let i = 0; i < sel.projectedCorners.length; i++) {
					const cdx = pageX - sel.projectedCorners[i].x
					const cdy = pageY - sel.projectedCorners[i].y
					if (Math.sqrt(cdx * cdx + cdy * cdy) < hitRadius) {
						const shape = editor.getShape(sel.shapeId as any)
						if (!shape) continue

						const oppositeIdx = (i + 2) % 4
						const anchor = sel.pageCorners[oppositeIdx]

						const geoBounds = editor.getShapeGeometry(shape).bounds
						const initialBounds = new Box(geoBounds.x, geoBounds.y, geoBounds.w, geoBounds.h)
						const transform = editor.getShapePageTransform(shape.id)
						const initialPageTransform = transform ? transform.clone() : Mat.Identity()

						editor.markHistoryStoppingPoint('resize')
						dragState = {
							type: 'resize',
							cornerIndex: i,
							shapeId: shape.id,
							anchor,
							initialBoundsW: initialBounds.w,
							initialBoundsH: initialBounds.h,
							initialShape: { ...shape } as TLShape,
							initialBounds,
							initialPageTransform,
						}
						// Set resize cursor based on corner
						const isNWSE = i === 0 || i === 2
						document.body.style.cursor = isNWSE ? 'nwse-resize' : 'nesw-resize'
						e.stopPropagation()
						e.preventDefault()
						return
					}
				}
			}

			// 3. Hit test against projected shapes (sorted deepest/topmost first)
			for (const shape of rProjectedShapes.current) {
				if (hitTestProjectedPolygon(pageX, pageY, shape.polygon)) {
					if (e.shiftKey) {
						const current = new Set<string>(editor.getSelectedShapeIds())
						if (current.has(shape.id)) {
							current.delete(shape.id)
						} else {
							current.add(shape.id)
						}
						editor.setSelectedShapes([...current] as any)
					} else if (!editor.getSelectedShapeIds().includes(shape.id as any)) {
						editor.select(shape.id as any)
					}
					// Start move drag
					editor.markHistoryStoppingPoint('move')
					dragState = {
						type: 'move',
						lastScreenX: e.clientX,
						lastScreenY: e.clientY,
					}
					e.stopPropagation()
					e.preventDefault()
					return
				}
			}

			// 4. Clicked on empty space — deselect
			editor.selectNone()
			e.stopPropagation()
		}

		function handlePointerMove(e: PointerEvent) {
			if (dragState.type === 'none') return

			const canvas = rCanvas.current
			if (!canvas) return

			const rect = canvas.getBoundingClientRect()
			const camera = editor.getCamera()

			if (dragState.type === 'move') {
				const dx = (e.clientX - dragState.lastScreenX) / camera.z
				const dy = (e.clientY - dragState.lastScreenY) / camera.z
				dragState.lastScreenX = e.clientX
				dragState.lastScreenY = e.clientY

				// Move all selected shapes
				const selectedIds = editor.getSelectedShapeIds()
				for (const id of selectedIds) {
					const shape = editor.getShape(id)
					if (!shape) continue
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						x: shape.x + dx,
						y: shape.y + dy,
					} as any)
				}
			} else if (dragState.type === 'resize') {
				const pageX = (e.clientX - rect.left) / camera.z - camera.x
				const pageY = (e.clientY - rect.top) / camera.z - camera.y

				let scaleX = Math.abs(pageX - dragState.anchor.x) / dragState.initialBoundsW
				let scaleY = Math.abs(pageY - dragState.anchor.y) / dragState.initialBoundsH
				// Clamp minimum scale
				scaleX = Math.max(0.1, scaleX)
				scaleY = Math.max(0.1, scaleY)

				editor.resizeShape(
					dragState.shapeId,
					{ x: scaleX, y: scaleY },
					{
						initialShape: dragState.initialShape,
						initialBounds: dragState.initialBounds,
						initialPageTransform: dragState.initialPageTransform,
						scaleOrigin: dragState.anchor,
						mode: 'resize_bounds',
					}
				)
			} else if (dragState.type === 'rotate') {
				const pageX = (e.clientX - rect.left) / camera.z - camera.x
				const pageY = (e.clientY - rect.top) / camera.z - camera.y

				const currentAngle = Math.atan2(pageY - dragState.center.y, pageX - dragState.center.x)
				const deltaAngle = currentAngle - dragState.initialAngle

				const shape = editor.getShape(dragState.shapeId)
				if (shape) {
					editor.updateShape({
						id: shape.id,
						type: shape.type,
						rotation: dragState.initialRotation + deltaAngle,
					} as any)
				}
			}

			e.stopPropagation()
			e.preventDefault()
		}

		function handlePointerUp(e: PointerEvent) {
			if (dragState.type === 'none') return
			document.body.style.cursor = ''
			dragState = { type: 'none' }
			e.stopPropagation()
			e.preventDefault()
		}

		container.addEventListener('pointerdown', handlePointerDown, true)
		window.addEventListener('pointermove', handlePointerMove, true)
		window.addEventListener('pointerup', handlePointerUp, true)
		return () => {
			container.removeEventListener('pointerdown', handlePointerDown, true)
			window.removeEventListener('pointermove', handlePointerMove, true)
			window.removeEventListener('pointerup', handlePointerUp, true)
			document.body.style.cursor = ''
		}
	}, [isSculpting, editor])

	// Render loop when sculpting
	useEffect(() => {
		if (!isSculpting) return

		let raf = -1
		function loop() {
			render()
			raf = requestAnimationFrame(loop)
		}
		loop()
		return () => cancelAnimationFrame(raf)
	}, [isSculpting, render])

	if (!isSculpting) {
		return null
	}

	return (
		<>
			<canvas ref={rCanvas} className="contour-3d-canvas" style={{ pointerEvents: 'none' }} />
			{!rHasShapes.current && (
				<div className="contour-3d-hint">Draw some closed shapes to sculpt</div>
			)}
		</>
	)
}
