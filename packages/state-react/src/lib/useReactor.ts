import { EffectScheduler } from '@tldraw/state'
import { throttleToNextFrame } from '@tldraw/utils'
import { useEffect } from 'react'

/**
 * A React hook that runs a side effect in response to changes in signals (reactive state).
 *
 * The effect function will automatically track any signals (atoms, computed values) that are
 * accessed during its execution. When any of those signals change, the effect will be
 * scheduled to run again on the next animation frame.
 *
 * This is useful for performing side effects (like updating the DOM, making API calls, or
 * updating external state) in response to changes in tldraw's reactive state system, while
 * keeping those effects efficiently batched and throttled.
 *
 * @example
 * ```tsx
 * import { useReactor, useEditor } from 'tldraw'
 *
 * function MyComponent() {
 *   const editor = useEditor()
 *
 *   // Update document title when shapes change
 *   useReactor(
 *     'update title',
 *     () => {
 *       const shapes = editor.getCurrentPageShapes()
 *       document.title = `Shapes: ${shapes.length}`
 *     },
 *     [editor]
 *   )
 *
 *   return <div>...</div>
 * }
 * ```
 *
 * @example
 * ```tsx
 * import { useReactor, useEditor } from 'tldraw'
 *
 * function SelectionAnnouncer() {
 *   const editor = useEditor()
 *
 *   // Announce selection changes for accessibility
 *   useReactor(
 *     'announce selection',
 *     () => {
 *       const selectedIds = editor.getSelectedShapeIds()
 *       if (selectedIds.length > 0) {
 *         console.log(`Selected ${selectedIds.length} shape(s)`)
 *       }
 *     },
 *     [editor]
 *   )
 *
 *   return null
 * }
 * ```
 *
 * @remarks
 * The effect is throttled to run at most once per animation frame using `requestAnimationFrame`.
 * This makes it suitable for effects that need to respond to state changes but don't need to
 * run synchronously.
 *
 * If you need the effect to run immediately without throttling, use {@link useQuickReactor} instead.
 *
 * The effect function will be re-created when any of the `deps` change, similar to React's
 * `useEffect`. The effect automatically tracks which signals it accesses, so you don't need
 * to manually specify them as dependencies.
 *
 * @param name - A debug name for the effect, useful for debugging and performance profiling.
 * @param reactFn - The effect function to run. Any signals accessed in this function will be tracked.
 * @param deps - React dependencies array. The effect will be recreated when these change. Defaults to `[]`.
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
