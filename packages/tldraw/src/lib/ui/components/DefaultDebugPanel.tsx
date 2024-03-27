import { debugFlags, track, useEditor, useValue, Vec } from '@tldraw/editor'
import { memo, useEffect, useRef, useState } from 'react'
import { useTldrawUiComponents } from '../context/components'

/** @internal */
export const DefaultDebugPanel = memo(function DefaultDebugPanel() {
	const { DebugMenu } = useTldrawUiComponents()

	return (
		<div className="tlui-debug-panel">
			<CurrentState />
			<FPS />
			{DebugMenu && <DebugMenu />}
		</div>
	)
})

function useTick(isEnabled = true) {
	const [_, setTick] = useState(0)
	const editor = useEditor()
	useEffect(() => {
		if (!isEnabled) return
		const update = () => setTick((tick) => tick + 1)
		editor.on('tick', update)
		return () => {
			editor.off('tick', update)
		}
	}, [editor, isEnabled])
}

const CurrentState = track(function CurrentState() {
	useTick()

	const editor = useEditor()

	const path = editor.getPath()
	const hoverShape = editor.getHoveredShape()
	const selectedShape = editor.getOnlySelectedShape()
	const shape = path === 'select.idle' || !path.includes('select.') ? hoverShape : selectedShape
	const shapeInfo =
		shape && path.includes('select.')
			? ` / ${shape.type || ''}${
					'geo' in shape.props ? ' / ' + shape.props.geo : ''
				} / [${Vec.ToFixed(editor.getPointInShapeSpace(shape, editor.inputs.currentPagePoint), 0)}]`
			: ''
	const ruler =
		path.startsWith('select.') && !path.includes('.idle')
			? ` / [${Vec.ToFixed(editor.inputs.originPagePoint, 0)}] → [${Vec.ToFixed(
					editor.inputs.currentPagePoint,
					0
				)}] = ${Vec.Dist(editor.inputs.originPagePoint, editor.inputs.currentPagePoint).toFixed(0)}`
			: ''

	return <div className="tlui-debug-panel__current-state">{`${path}${shapeInfo}${ruler}`}</div>
})

function FPS() {
	const showFps = useValue('show_fps', () => debugFlags.showFps.get(), [debugFlags])

	const fpsRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!showFps) return

		const TICK_LENGTH = 250
		let maxKnownFps = 0
		let cancelled = false

		let start = performance.now()
		let currentTickLength = 0
		let framesInCurrentTick = 0
		let isSlow = false

		// A "tick" is the amount of time between renders. Even though
		// we'll loop on every frame, we will only paint when the time
		// since the last paint is greater than the tick length.

		// When we paint, we'll calculate the FPS based on the number
		// of frames that we've seen since the last time we rendered,
		// and the actual time since the last render.
		function loop() {
			if (cancelled) return

			// Count the frame
			framesInCurrentTick++

			// Check if we should render
			currentTickLength = performance.now() - start

			if (currentTickLength > TICK_LENGTH) {
				// Calculate the FPS and paint it
				const fps = Math.round(
					framesInCurrentTick * (TICK_LENGTH / currentTickLength) * (1000 / TICK_LENGTH)
				)

				if (fps > maxKnownFps) {
					maxKnownFps = fps
				}

				const slowFps = maxKnownFps * 0.75
				if ((fps < slowFps && !isSlow) || (fps >= slowFps && isSlow)) {
					isSlow = !isSlow
				}

				fpsRef.current!.innerHTML = `FPS ${fps.toString()}`
				fpsRef.current!.className =
					`tlui-debug-panel__fps` + (isSlow ? ` tlui-debug-panel__fps__slow` : ``)

				// Reset the values
				currentTickLength -= TICK_LENGTH
				framesInCurrentTick = 0
				start = performance.now()
			}

			requestAnimationFrame(loop)
		}

		loop()

		return () => {
			cancelled = true
		}
	}, [showFps])

	if (!showFps) return null

	return <div ref={fpsRef} />
}
