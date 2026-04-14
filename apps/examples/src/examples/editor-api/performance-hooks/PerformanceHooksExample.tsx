import { useCallback, useEffect, useState } from 'react'
import {
	Editor,
	PerformanceApiAdapter,
	TLCameraEndPerfEvent,
	TLInteractionEndPerfEvent,
	TLPerfFrameTimeStats,
	Tldraw,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './performance-hooks.css'

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

// [4]
export default function PerformanceHooksExample() {
	const handleMount = useCallback((editor: Editor) => {
		editor.createShapes([
			{ type: 'geo', x: 100, y: 100, props: { w: 200, h: 200, fill: 'solid' } },
			{ type: 'geo', x: 400, y: 100, props: { w: 150, h: 150, geo: 'ellipse', fill: 'solid' } },
			{ type: 'geo', x: 200, y: 350, props: { w: 250, h: 100, geo: 'diamond', fill: 'solid' } },
		])
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} components={{ InFrontOfTheCanvas: PerfPanel }} />
		</div>
	)
}

/*
[1]
The PerfPanel subscribes to both `interaction-end` and `camera-end`
events. Only the most recent event is shown — each new event replaces
the previous one. Placed in the InFrontOfTheCanvas slot.

[2]
`editor.performance.on('interaction-end', fn)` fires when any interaction
completes (translate, resize, rotate, draw, etc.). `camera-end` fires
after panning or zooming stops (debounced). Both include frame time
stats (avg, p95, fps) plus contextual data.

[3]
The PerformanceApiAdapter pipes perf events into the browser's
Performance API (`performance.mark()` / `performance.measure()`).
Open DevTools → Performance tab → record → interact → stop, and you'll
see named measures like `tldraw:interaction:translating` in the Timings
lane. It's optional and tree-shakeable.

[4]
We create some shapes on mount so there's something to interact with.
Drag a shape or pan the canvas to see the performance panel update.
*/
