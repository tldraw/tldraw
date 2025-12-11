import { debugFlags, track, useEditor, usePassThroughWheelEvents, useValue } from '@tldraw/editor'
import { memo, useEffect, useRef } from 'react'
import { useTldrawUiComponents } from '../context/components'

/** @internal */
export const DefaultDebugPanel = memo(function DefaultDebugPanel() {
	const { DebugMenu } = useTldrawUiComponents()

	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	return (
		<footer ref={ref} className="tlui-debug-panel">
			<CurrentState />
			<FPS />
			{DebugMenu && <DebugMenu />}
		</footer>
	)
})

const CurrentState = track(function CurrentState() {
	const editor = useEditor()
	const path = editor.getPath()
	return <div className="tlui-debug-panel__current-state">{`${path}`}</div>
})

function FPS() {
	const editor = useEditor()
	const showFps = useValue('show_fps', () => debugFlags.showFps.get(), [debugFlags])

	const fpsRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!showFps) return

		const TICK_LENGTH = 250
		let maxKnownFps = 0
		let raf = -1

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

			raf = editor.timers.requestAnimationFrame(loop)
		}

		loop()

		return () => {
			cancelAnimationFrame(raf)
		}
	}, [showFps, editor])

	if (!showFps) return null

	return <div ref={fpsRef} />
}
