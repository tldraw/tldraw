import { EMPTY_ARRAY, EffectScheduler } from '@tldraw/state'
import { useEffect } from 'react'

/**
 * A React hook that runs side effects immediately in response to signal changes, without throttling.
 * Unlike useReactor which batches updates to animation frames, useQuickReactor executes the effect
 * function immediately when dependencies change, making it ideal for critical updates that cannot wait.
 *
 * The effect runs immediately when the component mounts and whenever tracked signals change.
 * Updates are not throttled, so the effect executes synchronously on every change.
 *
 * @example
 * ```ts
 * function DataSynchronizer() {
 *   const criticalData = useAtom('criticalData', null)
 *
 *   useQuickReactor('sync-data', () => {
 *     const data = criticalData.get()
 *     if (data) {
 *       // Send immediately - don't wait for next frame
 *       sendToServer(data)
 *     }
 *   }, [criticalData])
 *
 *   return <div>Sync status updated</div>
 * }
 * ```
 *
 * @example
 * ```ts
 * function CursorUpdater({ editor }) {
 *   useQuickReactor('update-cursor', () => {
 *     const cursor = editor.getInstanceState().cursor
 *     document.body.style.cursor = cursor.type
 *   }, [])
 * }
 * ```
 *
 * @param name - A descriptive name for the reactor, used for debugging and performance profiling
 * @param reactFn - The effect function to execute when signals change. Should not return a value.
 * @param deps - Optional dependency array that controls when the reactor is recreated. Works like useEffect deps.
 * @public
 */
export function useQuickReactor(name: string, reactFn: () => void, deps: any[] = EMPTY_ARRAY) {
	useEffect(() => {
		const scheduler = new EffectScheduler(name, reactFn)
		scheduler.attach()
		scheduler.execute()
		return () => {
			scheduler.detach()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)
}
