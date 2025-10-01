import { EffectScheduler } from '@tldraw/state'
import { throttleToNextFrame } from '@tldraw/utils'
import { useEffect } from 'react'

/**
 * A React hook that runs side effects in response to signal changes, with updates throttled to animation frames for optimal performance.
 *
 * Unlike regular React effects, `useReactor` automatically tracks which signals are accessed within the effect function
 * and re-executes the effect when those signals change. Updates are batched and throttled to animation frames to
 * prevent excessive re-execution during rapid state changes.
 *
 * The effect runs immediately when the component mounts, then again whenever tracked signals change, but updates
 * are batched to animation frames for smooth performance.
 *
 * @param name - A descriptive name for the effect, used for debugging and development tools
 * @param reactFn - The effect function to execute. This function will be tracked for signal dependencies and re-executed when they change
 * @param deps - Optional dependency array similar to other React hooks. When provided, the effect will only be recreated if dependencies change. Defaults to an empty array
 *
 * @example
 * ```ts
 * function CanvasRenderer() {
 *   const shapes = useAtom('shapes', [])
 *
 *   useReactor('canvas-update', () => {
 *     // This runs at most once per animation frame
 *     redrawCanvas(shapes.get())
 *   }, [shapes])
 *
 *   return <canvas ref={canvasRef} />
 * }
 * ```
 *
 * @example
 * ```ts
 * function AnimatedCounter() {
 *   const count = useAtom('count', 0)
 *   const elementRef = useRef<HTMLDivElement>(null)
 *
 *   useReactor('animate-color', () => {
 *     const element = elementRef.current
 *     if (element) {
 *       // Animate background color based on count
 *       element.style.backgroundColor = count.get() > 10 ? 'green' : 'blue'
 *     }
 *   }, [count])
 *
 *   return (
 *     <div ref={elementRef}>
 *       <button onClick={() => count.set(count.get() + 1)}>
 *         Count: {count.get()}
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 *
 * @public
 */
export function useReactor(name: string, reactFn: () => void, deps: undefined | any[] = []) {
	useEffect(() => {
		let cancelFn: () => void | undefined
		const scheduler = new EffectScheduler(name, reactFn, {
			scheduleEffect: (cb) => {
				cancelFn = throttleToNextFrame(cb)
			},
		})
		scheduler.attach()
		scheduler.execute()
		return () => {
			scheduler.detach()
			cancelFn?.()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)
}
