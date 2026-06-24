import { useEffect, useMemo, useState } from 'react'
import {
	Editor,
	TLComponents,
	TLGeoShape,
	Tldraw,
	TldrawOptions,
	TldrawUiButton,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './performance-options.css'

// There's a guide at the bottom of this file!

const MAX_SHAPES = 6000
const ADD_BATCH = 2000
const COLORS = ['blue', 'green', 'orange', 'violet'] as const

const getLiveZoom = (editor: Editor) => editor.getZoomLevel()
const getEfficientZoom = (editor: Editor) => editor.getEfficientZoomLevel()

// [1]
const components: TLComponents = {
	// the style panel is irrelevant to a performance demo, so hide it to keep
	// the canvas clean
	StylePanel: null,
}

// [2]
function useFps(editor: Editor) {
	const [fps, setFps] = useState(0)

	useEffect(() => {
		let frames = 0
		let last = performance.now()
		// the editor runs a single requestAnimationFrame loop and emits 'tick'
		// once per frame, so counting ticks measures the real frame rate the
		// canvas is achieving under load
		function handleTick() {
			frames++
			const now = performance.now()
			const elapsed = now - last
			if (elapsed >= 500) {
				setFps(Math.round((frames * 1000) / elapsed))
				frames = 0
				last = now
			}
		}
		editor.on('tick', handleTick)
		return () => {
			editor.off('tick', handleTick)
		}
	}, [editor])

	return fps
}

// [3]
function ReRenderMetric({
	editor,
	label,
	code,
	getZoom,
	resetSignal,
	accent,
}: {
	editor: Editor
	label: string
	code: string
	getZoom(editor: Editor): number
	resetSignal: number
	accent?: boolean
}) {
	const zoom = useValue(`zoom ${label}`, () => getZoom(editor), [editor, getZoom])

	// counts how many times the zoom value changed, i.e. how many times any
	// component reading it would have re-rendered
	const [updates, setUpdates] = useState(-1)

	useEffect(() => {
		setUpdates((count) => count + 1)
	}, [zoom])

	useEffect(() => {
		setUpdates(0)
	}, [resetSignal])

	return (
		<div className={`perf-metric ${accent ? 'perf-metric--accent' : ''}`}>
			<span className="perf-metric__label">{label}</span>
			<span className="perf-metric__count">{updates}</span>
			<code className="perf-metric__code">{code}</code>
		</div>
	)
}

// [4]
function PerformancePanel({
	editor,
	maxShapes,
	useDebouncedZoom,
	threshold,
	onChangeMaxShapes,
	onChangeUseDebouncedZoom,
	onChangeThreshold,
}: {
	editor: Editor
	maxShapes: number
	useDebouncedZoom: boolean
	threshold: number
	onChangeMaxShapes(next: number): void
	onChangeUseDebouncedZoom(next: boolean): void
	onChangeThreshold(next: number): void
}) {
	const fps = useFps(editor)
	const shapeCount = useValue('shape count', () => editor.getCurrentPageShapeIds().size, [editor])
	const [resetSignal, setResetSignal] = useState(0)
	const [limitMessage, setLimitMessage] = useState('')

	const [pendingMaxShapes, setPendingMaxShapes] = useState(maxShapes)
	const [pendingThreshold, setPendingThreshold] = useState(threshold)

	useEffect(() => {
		function handleMaxShapes({ name, count }: { name: string; count: number }) {
			setLimitMessage(`Page "${name}" is full at ${count} shapes.`)
		}
		editor.on('max-shapes', handleMaxShapes)
		return () => {
			editor.off('max-shapes', handleMaxShapes)
		}
	}, [editor])

	useEffect(() => {
		if (!limitMessage) return
		const timeout = setTimeout(() => setLimitMessage(''), 3000)
		return () => clearTimeout(timeout)
	}, [limitMessage])

	const limit = editor.options.maxShapesPerPage
	const atLimit = shapeCount >= limit
	const fill = Math.min(100, (shapeCount / limit) * 100)

	const addShapes = () => {
		const start = shapeCount
		// lay the whole page out as a square, sized to the shape cap so the
		// grid stays stable as batches are added
		const cols = Math.ceil(Math.sqrt(limit))
		editor.run(() => {
			for (let i = 0; i < ADD_BATCH; i++) {
				const n = start + i
				editor.createShape<TLGeoShape>({
					type: 'geo',
					x: (n % cols) * 30,
					y: Math.floor(n / cols) * 30,
					props: { w: 20, h: 20, fill: 'solid', color: COLORS[n % COLORS.length] },
				})
			}
		})
		editor.zoomToFit()
	}

	return (
		<div className="perf-panel">
			<div className="perf-panel__fps">
				<b className={fps > 0 && fps < 40 ? 'perf-panel__fps-value--low' : ''}>{fps}</b>
				<span>fps</span>
			</div>

			{/* [5] */}
			<div className="perf-section">
				<div className="perf-section__title">Zoom re-renders / gesture</div>
				<div className="perf-compare">
					<ReRenderMetric
						editor={editor}
						label="live"
						code="getZoomLevel()"
						getZoom={getLiveZoom}
						resetSignal={resetSignal}
					/>
					<ReRenderMetric
						editor={editor}
						label="efficient"
						code="getEfficientZoomLevel()"
						getZoom={getEfficientZoom}
						resetSignal={resetSignal}
						accent
					/>
				</div>
				<button className="perf-reset" onClick={() => setResetSignal((signal) => signal + 1)}>
					Reset counters
				</button>
			</div>

			{/* [6] */}
			<div className="perf-section">
				<div className="perf-section__head">
					<span className="perf-section__title">Shapes</span>
					<span className={`perf-section__count ${atLimit ? 'perf-section__count--at-limit' : ''}`}>
						{shapeCount} / {limit}
					</span>
				</div>
				<div className="perf-bar">
					<div
						className={`perf-bar__fill ${atLimit ? 'perf-bar__fill--at-limit' : ''}`}
						style={{ width: `${fill}%` }}
					/>
				</div>
				<div className="perf-row">
					<TldrawUiButton type="primary" disabled={atLimit} onClick={addShapes}>
						{atLimit ? 'Page is full' : `Add ${ADD_BATCH} shapes`}
					</TldrawUiButton>
					<TldrawUiButton
						type="normal"
						disabled={shapeCount === 0}
						onClick={() => editor.deleteShapes([...editor.getCurrentPageShapeIds()])}
					>
						Clear
					</TldrawUiButton>
				</div>
				{limitMessage && <div className="perf-warning">{limitMessage}</div>}
			</div>

			{/* [7] */}
			<div className="perf-section">
				<label className="perf-opt">
					<input
						type="checkbox"
						checked={useDebouncedZoom}
						onChange={(e) => onChangeUseDebouncedZoom(e.currentTarget.checked)}
					/>
					debouncedZoom
				</label>
				<label className="perf-opt perf-opt--slider">
					<span>
						debouncedZoomThreshold <b>{pendingThreshold}</b>
					</span>
					<input
						type="range"
						min={0}
						max={200}
						step={10}
						value={pendingThreshold}
						disabled={!useDebouncedZoom}
						onChange={(e) => setPendingThreshold(Number(e.currentTarget.value))}
						onPointerUp={(e) => onChangeThreshold(Number(e.currentTarget.value))}
						onKeyUp={(e) => onChangeThreshold(Number(e.currentTarget.value))}
						onBlur={(e) => onChangeThreshold(Number(e.currentTarget.value))}
					/>
				</label>
				<label className="perf-opt perf-opt--slider">
					<span>
						maxShapesPerPage <b>{pendingMaxShapes}</b>
					</span>
					<input
						type="range"
						min={2000}
						max={12000}
						step={500}
						value={pendingMaxShapes}
						onChange={(e) => setPendingMaxShapes(Number(e.currentTarget.value))}
						onPointerUp={(e) => onChangeMaxShapes(Number(e.currentTarget.value))}
						onKeyUp={(e) => onChangeMaxShapes(Number(e.currentTarget.value))}
						onBlur={(e) => onChangeMaxShapes(Number(e.currentTarget.value))}
					/>
				</label>
			</div>
		</div>
	)
}

export default function PerformanceOptionsExample() {
	const [editor, setEditor] = useState<Editor | null>(null)
	const [maxShapes, setMaxShapes] = useState(MAX_SHAPES)
	const [useDebouncedZoom, setUseDebouncedZoom] = useState(true)
	const [threshold, setThreshold] = useState(50)

	// [8]
	const options = useMemo<Partial<TldrawOptions>>(
		() => ({
			maxShapesPerPage: maxShapes,
			debouncedZoom: useDebouncedZoom,
			debouncedZoomThreshold: threshold,
		}),
		[maxShapes, useDebouncedZoom, threshold]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw options={options} components={components} onMount={setEditor} />
			{editor && (
				<PerformancePanel
					editor={editor}
					maxShapes={maxShapes}
					useDebouncedZoom={useDebouncedZoom}
					threshold={threshold}
					onChangeMaxShapes={setMaxShapes}
					onChangeUseDebouncedZoom={setUseDebouncedZoom}
					onChangeThreshold={setThreshold}
				/>
			)}
		</div>
	)
}

/*
This example demonstrates the performance-related editor options in
TldrawOptions: the page shape limit (with the max-shapes event it emits) and
the debounced zoom options. Everything lives in one panel on the left.

[1]
The style panel is hidden via the components prop — color and size pickers
have nothing to do with this demo, so dropping them keeps the canvas clear.

[2]
The frame-rate readout makes the cost concrete. The editor runs a single
requestAnimationFrame loop and emits a 'tick' event once per frame, so
counting ticks over a short window measures the frame rate the canvas is
actually achieving. Fill the page with thousands of shapes, turn
debouncedZoom off, and zoom with the wheel: the counter drops as every
zoom-dependent component re-renders each frame. Turn it back on and the
frame rate holds.

[3]
Why debounced zoom matters: during a zoom gesture the camera changes on
every frame, so anything that derives from the zoom level recomputes on
every frame too. tldraw has many such consumers internally — note shape
shadows and handles, text outline level-of-detail, group outlines, and
video controls all decide what to render based on zoom.

editor.getEfficientZoomLevel() equals the live zoom while the camera is
still, but freezes at the gesture's starting value while the camera moves
(once the page holds more shapes than debouncedZoomThreshold). This metric
reads one of the two zoom signals and counts how many times its value
changed — every change is a re-render for each component reading it. The
two cells make the gap visible: grab the zoom and the live count climbs
with every frame while the efficient count ticks up once or twice.

[4]
The panel reads everything it shows from the editor passed in as a prop
(see [8]): the frame rate, the live shape count, and the max-shapes event.
When an operation would push a page past maxShapesPerPage (default 4000,
raised to 6000 here), the editor rejects it and emits 'max-shapes' with the
page name and limit. Here it becomes a temporary warning; tldraw's default
UI turns the same event into a toast.

[5]
The re-render comparison, with the efficient cell accented since it's the
win. "Reset counters" zeroes both so you can measure a single gesture.

[6]
The shape count and limit, shown as a progress bar that fills and turns red
as the page approaches maxShapesPerPage. At the limit the add button
disables — feedback that doesn't wait for a rejection.

[7]
The option controls. debouncedZoom toggles the optimization; turn it off
and both counts climb in lockstep. debouncedZoomThreshold is the shape
count above which the debounced value kicks in (small pages always use live
zoom, since re-rendering a few shapes is cheap). maxShapesPerPage sets the
cap. The sliders commit on release rather than while dragging, since each
commit recreates the editor (see [8]).

[8]
Editor options are read once when the editor is created, so committing a
change to the options prop tears down and recreates the editor. onMount
fires again for the new instance, so the panel always holds the live
editor; the document store survives recreation, which is why your shapes
stay put while you experiment.
*/
