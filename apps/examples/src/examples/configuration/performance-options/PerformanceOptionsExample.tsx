import { useEffect, useMemo, useState } from 'react'
import {
	Editor,
	TLComponents,
	TLGeoShape,
	Tldraw,
	TldrawOptions,
	TldrawUiButton,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './performance-options.css'

// There's a guide at the bottom of this file!

const MAX_SHAPES = 750
const ADD_BATCH = 250
const COLORS = ['blue', 'green', 'orange', 'violet'] as const

const getLiveZoom = (editor: Editor) => editor.getZoomLevel()
const getEfficientZoom = (editor: Editor) => editor.getEfficientZoomLevel()

// [1]
function ZoomReadout({
	label,
	getZoom,
	resetSignal,
}: {
	label: string
	getZoom(editor: Editor): number
	resetSignal: number
}) {
	const editor = useEditor()
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
		<div className="perf-panel__readout">
			<code>{label}</code>
			<span>{zoom.toFixed(2)}</span>
			<b>
				{updates} update{updates === 1 ? '' : 's'}
			</b>
		</div>
	)
}

function PerformancePanel() {
	const editor = useEditor()
	const [limitMessage, setLimitMessage] = useState('')
	const [resetSignal, setResetSignal] = useState(0)

	const shapeCount = useValue('shape count', () => editor.getCurrentPageShapeIds().size, [editor])

	// [2]
	useEffect(() => {
		function handleMaxShapes({ name, count }: { name: string; count: number }) {
			setLimitMessage(`Rejected: page "${name}" is at its limit of ${count} shapes.`)
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

	// [3]
	const atLimit = shapeCount >= editor.options.maxShapesPerPage

	const addShapes = () => {
		const start = shapeCount
		editor.run(() => {
			for (let i = 0; i < ADD_BATCH; i++) {
				const n = start + i
				editor.createShape<TLGeoShape>({
					type: 'geo',
					x: (n % 12) * 70,
					y: Math.floor(n / 12) * 70,
					props: { w: 50, h: 50, fill: 'solid', color: COLORS[n % COLORS.length] },
				})
			}
		})
		editor.zoomToFit()
	}

	return (
		<div className="perf-panel">
			<div className="perf-panel__row">
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
				<TldrawUiButton type="normal" onClick={() => setResetSignal((signal) => signal + 1)}>
					Reset counters
				</TldrawUiButton>
			</div>
			{/* [4] */}
			<div className="perf-panel__readouts">
				<ZoomReadout label="getZoomLevel()" getZoom={getLiveZoom} resetSignal={resetSignal} />
				<ZoomReadout
					label="getEfficientZoomLevel()"
					getZoom={getEfficientZoom}
					resetSignal={resetSignal}
				/>
			</div>
			<div className={`perf-panel__status ${atLimit ? 'perf-panel__status--at-limit' : ''}`}>
				shapes: <b>{shapeCount}</b> / {editor.options.maxShapesPerPage}
			</div>
			{limitMessage && <div className="perf-panel__warning">{limitMessage}</div>}
		</div>
	)
}

const components: TLComponents = {
	TopPanel: PerformancePanel,
}

// [5]
function PerformanceConfigPanel({
	maxShapes,
	useDebouncedZoom,
	threshold,
	onCommitMaxShapes,
	onChangeUseDebouncedZoom,
	onCommitThreshold,
}: {
	maxShapes: number
	useDebouncedZoom: boolean
	threshold: number
	onCommitMaxShapes(next: number): void
	onChangeUseDebouncedZoom(next: boolean): void
	onCommitThreshold(next: number): void
}) {
	const [pendingMaxShapes, setPendingMaxShapes] = useState(maxShapes)
	const [pendingThreshold, setPendingThreshold] = useState(threshold)
	const commitMaxShapes = (input: HTMLInputElement) => onCommitMaxShapes(Number(input.value))
	const commitThreshold = (input: HTMLInputElement) => onCommitThreshold(Number(input.value))

	return (
		<div className="perf-config">
			<div className="perf-config__title">Page shape limit</div>
			<label className="perf-config__row perf-config__row--slider">
				<span>
					maxShapesPerPage: <b>{pendingMaxShapes}</b> shapes
				</span>
				<input
					type="range"
					min={250}
					max={2000}
					step={50}
					value={pendingMaxShapes}
					onChange={(e) => setPendingMaxShapes(Number(e.currentTarget.value))}
					onPointerUp={(e) => commitMaxShapes(e.currentTarget)}
					onKeyUp={(e) => commitMaxShapes(e.currentTarget)}
					onBlur={(e) => commitMaxShapes(e.currentTarget)}
				/>
			</label>
			<div className="perf-config__title">Debounced zoom options</div>
			<label className="perf-config__row">
				<input
					type="checkbox"
					checked={useDebouncedZoom}
					onChange={(e) => onChangeUseDebouncedZoom(e.currentTarget.checked)}
				/>
				debouncedZoom
			</label>
			<label className="perf-config__row perf-config__row--slider">
				<span>
					debouncedZoomThreshold: <b>{pendingThreshold}</b> shapes
				</span>
				<input
					type="range"
					min={0}
					max={200}
					step={10}
					value={pendingThreshold}
					disabled={!useDebouncedZoom}
					onChange={(e) => setPendingThreshold(Number(e.currentTarget.value))}
					onPointerUp={(e) => commitThreshold(e.currentTarget)}
					onKeyUp={(e) => commitThreshold(e.currentTarget)}
					onBlur={(e) => commitThreshold(e.currentTarget)}
				/>
			</label>
		</div>
	)
}

export default function PerformanceOptionsExample() {
	const [maxShapes, setMaxShapes] = useState(MAX_SHAPES)
	const [useDebouncedZoom, setUseDebouncedZoom] = useState(true)
	const [threshold, setThreshold] = useState(50)

	// [6]
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
			<Tldraw options={options} components={components} />
			<PerformanceConfigPanel
				maxShapes={maxShapes}
				useDebouncedZoom={useDebouncedZoom}
				threshold={threshold}
				onCommitMaxShapes={setMaxShapes}
				onChangeUseDebouncedZoom={setUseDebouncedZoom}
				onCommitThreshold={setThreshold}
			/>
		</div>
	)
}

/*
This example demonstrates the performance-related editor options in
TldrawOptions: the page shape limit (with the max-shapes event it emits) and
the debounced zoom options.

[1]
Why debounced zoom matters: during a zoom gesture the camera changes on
every frame, so anything that derives from the zoom level recomputes on
every frame too. tldraw has many such consumers internally. Note shape
shadows and handles, text outline level-of-detail, group outlines, and
video controls all decide what to render based on zoom.

The fix is to give that code a different signal to read.
editor.getEfficientZoomLevel() equals the live zoom while the camera is
still, but freezes at the gesture's starting value while the camera moves
(once the page holds more shapes than debouncedZoomThreshold). Consumers
re-render once when the gesture ends instead of sixty times per second
during it.

This component makes the difference countable. It reads one of the two zoom
signals and counts how many times the value changed. Every one of those
changes is a re-render for each component that reads the signal. Add 50+
shapes, grab the zoom with the mouse wheel, and compare: the live counter
climbs with every frame of the gesture while the efficient counter ticks
up once or twice.

[2]
When an operation would push a page past maxShapesPerPage (default 4000,
lowered to 750 here), the editor rejects it and emits a 'max-shapes' event
with the page name and the limit. Listen for it to tell users why nothing
happened. Here it becomes a temporary warning banner; tldraw's default UI
turns the same event into a toast.

[3]
Feedback shouldn't only appear after a rejection. The panel also derives a
persistent at-limit state from the live shape count and the editor's own
options (editor.options.maxShapesPerPage): the counter turns red and the
add button disables.

[4]
The two readouts, one per zoom signal. The "Reset counters" button zeroes
them so you can measure a single gesture.

[5]
The bottom-left panel reconfigures the performance options at runtime.

- maxShapesPerPage (default 4000, lowered to 750 here) caps how many shapes
  a page can hold. Raise or lower it and the at-limit feedback above tracks
  the new value: the counter turns red and the add button disables once the
  page reaches it.

The debounced zoom options:

- debouncedZoom (default true) turns the optimization on or off. Turn it
  off and zoom again: both counters now climb in lockstep, which is what
  every zoom-dependent component in the canvas would be doing.
- debouncedZoomThreshold (default 500, lowered here) is the shape count
  above which the debounced value kicks in. Small pages always use the
  live zoom, since re-rendering a few shapes is cheap. Drop the slider to
  0 and even an empty page debounces; raise it above your shape count and
  the efficient counter climbs like the live one again.

The sliders commit on release rather than while dragging, since each commit
recreates the editor (see [6]).

[6]
Editor options are read once when the editor instance is created, so
committing a change to the options prop tears down and recreates the
editor. The document store survives recreation, which is why your shapes
stay put while you experiment with the zoom options.
*/
