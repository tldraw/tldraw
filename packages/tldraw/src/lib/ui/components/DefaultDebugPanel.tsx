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
		let framesInCurrentTick = 0

		// We loop on every frame but only paint once per tick, computing FPS from
		// the frames seen since the last paint and the actual elapsed time.
		function loop() {
			framesInCurrentTick++

			const currentTickLength = performance.now() - start

			if (currentTickLength > TICK_LENGTH) {
				const fps = Math.round(
					framesInCurrentTick * (TICK_LENGTH / currentTickLength) * (1000 / TICK_LENGTH)
				)

				if (fps > maxKnownFps) {
					maxKnownFps = fps
				}

				const isSlow = fps < maxKnownFps * 0.75

				fpsRef.current!.innerHTML = `FPS ${fps.toString()} (max: ${maxKnownFps})`
				fpsRef.current!.className =
					`tlui-debug-panel__fps` + (isSlow ? ` tlui-debug-panel__fps__slow` : ``)

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
