import { EffectScheduler } from '@tldraw/state'
import React from 'react'

/**
 * Wraps some synchronous react render logic in a reactive tracking context.
 *
 * This allows you to use reactive values transparently.
 *
 * See the `track` component wrapper, which uses this under the hood.
 *
 * @param name - A debug name for the reactive tracking context
 * @param render - The render function that accesses reactive values
 * @param deps - Optional dependency array to control when the tracking context is recreated
 * @returns The result of calling the render function
 *
 * @example
 * ```ts
 * function MyComponent() {
 *   return useStateTracking('MyComponent', () => {
 *     const editor = useEditor()
 *     return <div>Num shapes: {editor.getCurrentPageShapes().length}</div>
 *   })
 * }
 * ```
 *
 *
 * @public
 */
export function useStateTracking<T>(name: string, render: () => T, deps: unknown[] = []): T {
	// This hook creates an effect scheduler that will trigger re-renders when its reactive dependencies change, but it
	// defers the actual execution of the effect to the consumer of this hook.

	// We need the exec fn to always be up-to-date when calling scheduler.execute() but it'd be wasteful to
	// instantiate a new EffectScheduler on every render, so we use an immediately-updated ref
	// to wrap it
	const renderRef = React.useRef(render)
	renderRef.current = render

	const [scheduler, subscribe, getSnapshot] = React.useMemo(() => {
		let scheduleUpdate = null as null | (() => void)
		// useSyncExternalStore requires a subscribe function that returns an unsubscribe function
		const subscribe = (cb: () => void) => {
			scheduleUpdate = cb
			return () => {
				scheduleUpdate = null
			}
		}

		const scheduler = new EffectScheduler(
			`useStateTracking(${name})`,
			// this is what `scheduler.execute()` will call
			() => renderRef.current?.(),
			// this is what will be invoked when @tldraw/state detects a change in an upstream reactive value
			{
				scheduleEffect() {
					scheduleUpdate?.()
				},
			}
		)

		// we use an incrementing number based on when this
		const getSnapshot = () => scheduler.scheduleCount

		return [scheduler, subscribe, getSnapshot]
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [name, ...deps])

	React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

	// reactive dependencies are captured when `scheduler.execute()` is called
	// and then to make it reactive we wait for a `useEffect` to 'attach'
	// this allows us to avoid rendering outside of React's render phase
	// and avoid 'zombie' components that try to render with bad/deleted data before
	// react has a chance to umount them.
	React.useEffect(() => {
		scheduler.attach()
		// do not execute, we only do that in render
		scheduler.maybeScheduleEffect()
		return () => {
			scheduler.detach()
		}
	}, [scheduler])

	return scheduler.execute()
}
