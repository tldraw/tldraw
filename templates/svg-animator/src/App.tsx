import { useCallback, useEffect, useRef, useState } from 'react'
import { b64Vecs, createShapeId, Editor, Tldraw } from 'tldraw'
import { AnimationControls } from './components/AnimationControls'
import { FillControls } from './components/FillControls'
import { SvgUploader } from './components/SvgUploader'
import {
	DEFAULT_FILL_OPTIONS,
	FillOptions,
	FillResult,
	generateFillSubPaths,
	parseSvg,
	Polygon,
} from './lib/fill-path'
import { groupPolygonsWithHoles, polygonBounds, resamplePath } from './lib/fill-path/polygon-utils'
import {
	animatePath,
	applyPressure,
	DEFAULT_PRESSURE_OPTIONS,
	EASING_FUNCTIONS,
} from './lib/path-animator'
import { PressureOptions } from './lib/path-animator/types'

// Shape IDs we track for cleanup
const OUTLINE_PREFIX = 'outline-'
const FILL_PREFIX = 'fill-'

const TLDRAW_COLORS = [
	'black',
	'grey',
	'white',
	'red',
	'light-red',
	'orange',
	'yellow',
	'green',
	'light-green',
	'blue',
	'light-blue',
	'violet',
	'light-violet',
] as const

type TldrawColor = (typeof TLDRAW_COLORS)[number]

/** Compute centroid (average position) of a point array */
function pathCentroid(points: { x: number; y: number }[]) {
	let cx = 0,
		cy = 0
	for (const p of points) {
		cx += p.x
		cy += p.y
	}
	const n = points.length || 1
	return { x: cx / n, y: cy / n }
}

/** Compute bounding box for an array of points */
function pointsBounds(points: { x: number; y: number }[]) {
	let minX = Infinity,
		minY = Infinity
	for (const p of points) {
		if (p.x < minX) minX = p.x
		if (p.y < minY) minY = p.y
	}
	return { minX, minY }
}

function App() {
	const editorRef = useRef<Editor | null>(null)
	const [polygons, setPolygons] = useState<Polygon[]>([])
	const [fillResults, setFillResults] = useState<FillResult[]>([])
	const [fillOptions, setFillOptions] = useState<FillOptions>(DEFAULT_FILL_OPTIONS)
	const [duration, setDuration] = useState(3000)
	const [easingName, setEasingName] = useState('easeInOutCubic')
	const [pressure, setPressure] = useState<PressureOptions>(DEFAULT_PRESSURE_OPTIONS)
	const [isAnimating, setIsAnimating] = useState(false)
	const animationRef = useRef<{ stop: () => void } | null>(null)
	const [fillColor, setFillColor] = useState<TldrawColor>('red')
	const [outlineColor, setOutlineColor] = useState<TldrawColor | 'transparent'>('black')

	const handleMount = useCallback((editor: Editor) => {
		editorRef.current = editor
	}, [])

	// Reactively update fill shape colors
	useEffect(() => {
		const editor = editorRef.current
		if (!editor) return
		const ids = [...editor.getCurrentPageShapeIds()].filter(
			(id) => typeof id === 'string' && id.includes(FILL_PREFIX)
		)
		if (ids.length === 0) return
		editor.updateShapes(
			ids.map((id) => ({
				id: id as any,
				type: 'draw',
				props: { color: fillColor },
			}))
		)
	}, [fillColor])

	// Reactively update outline shape colors/opacity
	useEffect(() => {
		const editor = editorRef.current
		if (!editor) return
		const ids = [...editor.getCurrentPageShapeIds()].filter(
			(id) => typeof id === 'string' && id.includes(OUTLINE_PREFIX)
		)
		if (ids.length === 0) return
		const isTransparent = outlineColor === 'transparent'
		editor.updateShapes(
			ids.map((id) => ({
				id: id as any,
				type: 'draw',
				opacity: isTransparent ? 0 : 1,
				props: isTransparent ? {} : { color: outlineColor },
			}))
		)
	}, [outlineColor])

	// Draw polygon outlines on the canvas, positioned at each polygon's bounding box
	const drawOutlines = useCallback(
		(polys: Polygon[]) => {
			const editor = editorRef.current
			if (!editor) return

			const isTransparent = outlineColor === 'transparent'

			for (const poly of polys) {
				const bounds = polygonBounds(poly)

				// Make points relative to bounding box origin
				const relPoints = poly.points.map((p) => ({
					x: p.x - bounds.minX,
					y: p.y - bounds.minY,
					z: 0.5,
				}))

				const segments = []
				for (let i = 0; i < relPoints.length; i++) {
					const a = relPoints[i]
					const b = relPoints[(i + 1) % relPoints.length]
					segments.push({ type: 'straight' as const, path: b64Vecs.encodePoints([a, b]) })
				}

				const id = createShapeId(OUTLINE_PREFIX + (poly.id || ''))
				editor.createShape({
					id,
					type: 'draw',
					x: bounds.minX,
					y: bounds.minY,
					opacity: isTransparent ? 0 : 1,
					props: {
						segments,
						color: isTransparent ? 'black' : outlineColor,
						size: 's',
						dash: 'solid',
						isComplete: true,
						isClosed: true,
						isPen: false,
						scale: 1,
					},
				})
			}

			// Zoom to fit all shapes
			setTimeout(() => editor.zoomToFit({ animation: { duration: 300 } }), 100)
		},
		[outlineColor]
	)

	// Draw fill paths on the canvas (static, no animation)
	const drawFillPaths = useCallback(
		(results: FillResult[]) => {
			const editor = editorRef.current
			if (!editor) return

			// Clear old fill shapes
			const fillIds = [...editor.getCurrentPageShapeIds()].filter(
				(id) => typeof id === 'string' && id.includes(FILL_PREFIX)
			)
			if (fillIds.length > 0) {
				editor.deleteShapes(fillIds as any)
			}

			for (let i = 0; i < results.length; i++) {
				const { path } = results[i]
				if (path.length < 2) continue

				// Resample for smoother drawing
				const resampled = resamplePath(path, 2)
				const { minX, minY } = pointsBounds(resampled)

				// Make points relative to bounding box origin, then apply pressure
				const relPoints = resampled.map((p) => ({ x: p.x - minX, y: p.y - minY }))
				const pressured = applyPressure(relPoints, pressure)

				const id = createShapeId(FILL_PREFIX + i)
				editor.createShape({
					id,
					type: 'draw',
					x: minX,
					y: minY,
					props: {
						segments: [{ type: 'free', path: b64Vecs.encodePoints(pressured) }],
						color: fillColor,
						size: 'm',
						dash: 'draw',
						isComplete: true,
						isClosed: false,
						isPen: true,
						scale: 1,
					},
				})
			}
		},
		[pressure, fillColor]
	)

	const clearFillShapes = useCallback(() => {
		const editor = editorRef.current
		if (!editor) return
		const ids = [...editor.getCurrentPageShapeIds()].filter(
			(id) => typeof id === 'string' && id.includes(FILL_PREFIX)
		)
		if (ids.length > 0) {
			editor.deleteShapes(ids as any)
		}
	}, [])

	// Clear all shapes from the canvas without touching React state
	const clearCanvasShapes = useCallback(() => {
		const editor = editorRef.current
		if (!editor) return
		const ids = [...editor.getCurrentPageShapeIds()]
		if (ids.length > 0) {
			editor.deleteShapes(ids as any)
		}
	}, [])

	const clearAll = useCallback(() => {
		clearCanvasShapes()
		setPolygons([])
		setFillResults([])
	}, [clearCanvasShapes])

	const handleSvgLoaded = useCallback(
		(svgString: string) => {
			const polys = parseSvg(svgString)
			clearCanvasShapes()
			setPolygons(polys)
			setFillResults([])
			drawOutlines(polys)
		},
		[clearCanvasShapes, drawOutlines]
	)

	const handleGenerate = useCallback(() => {
		if (polygons.length === 0) return

		// Group polygons into outer shapes with their holes
		const groups = groupPolygonsWithHoles(polygons)

		const results: FillResult[] = []
		for (const { outer, holes } of groups) {
			const subPaths = generateFillSubPaths(outer, { ...fillOptions, holes })
			for (const path of subPaths) {
				if (path.length > 0) {
					results.push({ polygon: outer, path })
				}
			}
		}

		// Sort by projection onto the fill progress direction (perpendicular to fill lines).
		// For angle 0° → top to bottom, 90° → left to right, 45° → upper-left to lower-right.
		const angleRad = (fillOptions.angle * Math.PI) / 180
		const dirX = Math.sin(angleRad)
		const dirY = Math.cos(angleRad)
		results.sort((a, b) => {
			const cA = pathCentroid(a.path)
			const cB = pathCentroid(b.path)
			return cA.x * dirX + cA.y * dirY - (cB.x * dirX + cB.y * dirY)
		})

		setFillResults(results)
		drawFillPaths(results)
	}, [polygons, fillOptions, drawFillPaths])

	const handleAnimate = useCallback(() => {
		const editor = editorRef.current
		if (!editor || fillResults.length === 0) return

		clearFillShapes()
		setIsAnimating(true)

		const easing = EASING_FUNCTIONS[easingName] || EASING_FUNCTIONS.easeInOutCubic

		// Animate each fill path sequentially
		let currentIndex = 0

		const animateNext = () => {
			if (currentIndex >= fillResults.length) {
				setIsAnimating(false)
				animationRef.current = null
				return
			}

			const { path } = fillResults[currentIndex]
			const resampled = resamplePath(path, 2)

			const anim = animatePath(
				editor,
				resampled,
				{
					duration: duration / fillResults.length,
					easing,
					pressure,
					segmentType: 'free',
					color: fillColor,
					onComplete: () => {
						currentIndex++
						animateNext()
					},
				},
				{
					createShapeId: () => createShapeId(FILL_PREFIX + currentIndex) as unknown as string,
					encodePoints: (pts) => b64Vecs.encodePoints(pts),
				}
			)

			animationRef.current = anim
		}

		animateNext()
	}, [fillResults, duration, easingName, pressure, fillColor, clearFillShapes])

	const handleStop = useCallback(() => {
		animationRef.current?.stop()
		setIsAnimating(false)
	}, [])

	return (
		<div style={{ position: 'fixed', inset: 0, display: 'flex' }}>
			{/* Control panel */}
			<div className="control-panel">
				<h2>SVG Animator</h2>

				<SvgUploader onSvgLoaded={handleSvgLoaded} />

				<div className="panel-section">
					<h3>Colors</h3>

					<label>
						Fill color
						<select value={fillColor} onChange={(e) => setFillColor(e.target.value as TldrawColor)}>
							{TLDRAW_COLORS.map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</select>
					</label>

					<label>
						Outline color
						<select
							value={outlineColor}
							onChange={(e) => setOutlineColor(e.target.value as TldrawColor | 'transparent')}
						>
							<option value="transparent">transparent</option>
							{TLDRAW_COLORS.map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</select>
					</label>
				</div>

				<FillControls
					options={fillOptions}
					onChange={setFillOptions}
					onGenerate={handleGenerate}
					onClear={clearAll}
					hasShapes={polygons.length > 0}
				/>

				<AnimationControls
					duration={duration}
					onDurationChange={setDuration}
					easingName={easingName}
					onEasingChange={setEasingName}
					pressure={pressure}
					onPressureChange={setPressure}
					onAnimate={handleAnimate}
					onStop={handleStop}
					isAnimating={isAnimating}
					hasFillPaths={fillResults.length > 0}
				/>
			</div>

			{/* Canvas */}
			<div style={{ flex: 1 }}>
				<Tldraw onMount={handleMount} />
			</div>
		</div>
	)
}

export default App
