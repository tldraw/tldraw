import { useCallback, useEffect, useState } from 'react'
import { Editor, PerformanceApiAdapter, TLInteractionEndPerfEvent, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './performance-hooks.css'

// [1]
function PerfPanel() {
	const editor = useEditor()
	const [lastEvent, setLastEvent] = useState<TLInteractionEndPerfEvent | null>(null)

	useEffect(() => {
		// [2]
		const unsub = editor.performance.on('interaction-end', (event) => {
			setLastEvent(event)
		})

		// [3]
		const adapter = new PerformanceApiAdapter(editor.performance)

		return () => {
			unsub()
			adapter.dispose()
		}
	}, [editor])

	return (
		<div className="perf-panel">
			{lastEvent ? (
				<>
					<div className="perf-section">
						<div className="perf-section-title">Last interaction</div>
						<div className="perf-row">
							<span className="perf-label">State</span>
							<span>{lastEvent.name}</span>
						</div>
						<div className="perf-row">
							<span className="perf-label">Duration</span>
							<span className="perf-value">{lastEvent.duration.toFixed(0)}ms</span>
						</div>
						<div className="perf-row">
							<span className="perf-label">FPS</span>
							<span className="perf-value">{lastEvent.fps.toFixed(1)}</span>
						</div>
						<div className="perf-row">
							<span className="perf-label">Frames</span>
							<span className="perf-value">{lastEvent.frameCount}</span>
						</div>
					</div>
					<div className="perf-section">
						<div className="perf-section-title">Frame times</div>
						<div className="perf-row">
							<span className="perf-label">Avg</span>
							<span className="perf-value">{lastEvent.avgFrameTime.toFixed(1)}ms</span>
						</div>
						<div className="perf-row">
							<span className="perf-label">Median</span>
							<span className="perf-value">{lastEvent.medianFrameTime.toFixed(1)}ms</span>
						</div>
						<div className="perf-row">
							<span className="perf-label">p95</span>
							<span className="perf-value">{lastEvent.p95FrameTime.toFixed(1)}ms</span>
						</div>
						<div className="perf-row">
							<span className="perf-label">p99</span>
							<span className="perf-value">{lastEvent.p99FrameTime.toFixed(1)}ms</span>
						</div>
					</div>
					<div className="perf-section">
						<div className="perf-section-title">Context</div>
						<div className="perf-row">
							<span className="perf-label">Selected shapes</span>
						</div>
						{Object.entries(lastEvent.selectedShapeTypes).map(([type, count]) => (
							<div className="perf-row" key={type}>
								<span className="perf-label">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
								<span className="perf-value">{count}</span>
							</div>
						))}
						<div className="perf-row">
							<span className="perf-label">All shapes</span>
							<span className="perf-value">{lastEvent.shapeCount}</span>
						</div>
						<div className="perf-row">
							<span className="perf-label">Zoom</span>
							<span className="perf-value">{(lastEvent.zoomLevel * 100).toFixed(0)}%</span>
						</div>
					</div>
				</>
			) : (
				<div className="perf-hint">Drag or resize a shape to see performance stats</div>
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
The PerfPanel component subscribes to `editor.performance` events
and displays frame time statistics for the most recent completed
interaction. It's placed in the InFrontOfTheCanvas slot, positioned
in the bottom-right corner.

[2]
`editor.performance.on('interaction-end', fn)` returns an unsubscribe
function, which we call on cleanup. The event fires when any interaction
completes (translate, resize, rotate, draw, etc.) and includes frame
time distribution stats (avg, median, p95, p99) plus context like
shape count and interaction name.

[3]
The PerformanceApiAdapter pipes perf events into the browser's
Performance API (`performance.mark()` / `performance.measure()`).
Open DevTools → Performance tab → record → interact with shapes →
stop recording, and you'll see named measures like
`tldraw:interaction:translating` in the Timings lane. It's optional
and tree-shakeable — only included if you import it.

[4]
We create some shapes on mount so there's something to interact with.
Select a shape and resize or drag it to see the performance panel update.
*/
