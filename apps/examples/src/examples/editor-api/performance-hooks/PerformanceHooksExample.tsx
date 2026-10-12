import { useEffect, useState } from 'react'
import {
	Editor,
	PerformanceApiAdapter,
	TLCameraEndPerfEvent,
	TLComponents,
	TLInteractionEndPerfEvent,
	TLPerfFrameTimeStats,
	Tldraw,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './performance-hooks.css'

// There's a guide at the bottom of this file!

function FrameTimeStats({ event }: { event: TLPerfFrameTimeStats }) {
	return (
		<div className="perf-section">
			<div className="perf-section-title">Frame times</div>
			<div className="perf-row">
				<span className="perf-label">Duration</span>
				<span className="perf-value">{event.duration.toFixed(0)}ms</span>
			</div>
			<div className="perf-row">
				<span className="perf-label">FPS</span>
				<span className="perf-value">{event.fps.toFixed(1)}</span>
			</div>
			<div className="perf-row">
				<span className="perf-label">Frames</span>
				<span className="perf-value">{event.frameCount}</span>
			</div>
			<div className="perf-row">
				<span className="perf-label">Avg</span>
				<span className="perf-value">{event.avgFrameTime.toFixed(1)}ms</span>
			</div>
			<div className="perf-row">
				<span className="perf-label">p95</span>
				<span className="perf-value">{event.p95FrameTime.toFixed(1)}ms</span>
			</div>
		</div>
	)
}

type LastEvent =
	| { kind: 'interaction'; event: TLInteractionEndPerfEvent }
	| { kind: 'camera'; event: TLCameraEndPerfEvent }

// [1]
function PerfPanel() {
	const editor = useEditor()
	const [last, setLast] = useState<LastEvent | null>(null)

	useEffect(() => {
		// [2]
		const unsubs = [
			editor.performance.on('interaction-end', (event) => {
				setLast({ kind: 'interaction', event })
			}),
			editor.performance.on('camera-end', (event) => {
				setLast({ kind: 'camera', event })
			}),
		]

		// [3]
		const adapter = new PerformanceApiAdapter(editor.performance)

		return () => {
			unsubs.forEach((unsub) => unsub())
			adapter.dispose()
		}
	}, [editor])

	return (
		<div className="perf-panel">
			{last ? (
				<>
					<div className="perf-section">
						<div className="perf-section-title">
							{last.kind === 'interaction'
								? `Interaction: ${last.event.name}`
								: `Camera: ${last.event.type}`}
						</div>
					</div>
					<FrameTimeStats event={last.event} />
					{last.kind === 'interaction' ? (
						<div className="perf-section">
							<div className="perf-section-title">Context</div>
							{Object.entries(last.event.selectedShapeTypes).map(([type, count]) => (
								<div className="perf-row" key={type}>
									<span className="perf-label">{type}</span>
									<span className="perf-value">{count}</span>
								</div>
							))}
							<div className="perf-row">
								<span className="perf-label">All shapes</span>
								<span className="perf-value">{last.event.shapeCount}</span>
							</div>
							<div className="perf-row">
								<span className="perf-label">Zoom</span>
								<span className="perf-value">{(last.event.zoomLevel * 100).toFixed(0)}%</span>
							</div>
						</div>
					) : (
						<div className="perf-section">
							<div className="perf-row">
								<span className="perf-label">Visible shapes</span>
								<span className="perf-value">{last.event.visibleShapeCount}</span>
							</div>
							<div className="perf-row">
								<span className="perf-label">Culled shapes</span>
								<span className="perf-value">{last.event.culledShapeCount}</span>
							</div>
							<div className="perf-row">
								<span className="perf-label">Zoom</span>
								<span className="perf-value">{(last.event.zoomLevel * 100).toFixed(0)}%</span>
							</div>
						</div>
					)}
				</>
			) : (
				<div className="perf-hint">Drag a shape or pan the canvas to see performance stats</div>
			)}
		</div>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: PerfPanel,
}

function handleMount(editor: Editor) {
	editor.createShapes([
		{ type: 'geo', x: 100, y: 100, props: { w: 200, h: 200, fill: 'solid' } },
		{ type: 'geo', x: 400, y: 100, props: { w: 150, h: 150, geo: 'ellipse', fill: 'solid' } },
		{ type: 'geo', x: 200, y: 350, props: { w: 250, h: 100, geo: 'diamond', fill: 'solid' } },
	])
}

export default function PerformanceHooksExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} components={components} />
		</div>
	)
}

/*
[1]
The panel lives in the `InFrontOfTheCanvas` slot so it can use `useEditor`. It shows only the most
recent event; each new one replaces the last.

[2]
`editor.performance.on('interaction-end', fn)` fires when any interaction completes (translate,
resize, rotate, draw, and so on). `camera-end` fires once panning or zooming has settled. Both carry
frame time stats (avg, p95, p99, fps) plus context such as shape counts and zoom level. `on` returns
an unsubscribe function, which the effect cleanup calls.

[3]
`PerformanceApiAdapter` mirrors the same events into the browser's Performance API with
`performance.mark()` and `performance.measure()`. Record in the DevTools performance tab while
interacting and you'll see measures like `tldraw:interaction:translating` in the timings lane. It's
optional; dispose it when you're done.
*/
