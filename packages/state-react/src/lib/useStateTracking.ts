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
	// The scheduler is memoized across renders, so it reads the latest render fn through a ref
	// rather than being recreated whenever `render` changes identity.
	const renderRef = React.useRef(render)
	renderRef.current = render

	const [scheduler, subscribe, getSnapshot] = React.useMemo(() => {
		let scheduleUpdate = null as null | (() => void)
		const subscribe = (cb: () => void) => {
			scheduleUpdate = cb
			return () => {
				scheduleUpdate = null
			}
		}

		// The scheduler only reruns the render fn when we call `execute()` during render; an
		// upstream change just asks useSyncExternalStore for a re-render.
		const scheduler = new EffectScheduler(`useStateTracking(${name})`, () => renderRef.current(), {
			scheduleEffect() {
				scheduleUpdate?.()
			},
		})

		// scheduleCount bumps on every upstream change, so it doubles as the store snapshot
		const getSnapshot = () => scheduler.scheduleCount

		return [scheduler, subscribe, getSnapshot]
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [name, ...deps])

	React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

	// Dependencies are captured by `execute()` during render, but we only attach in an effect.
	// Attaching during render would let 'zombie' components re-render against deleted data
	// before React has a chance to unmount them.
	React.useEffect(() => {
		scheduler.attach()
		// don't execute here; render already did. Just catch up on changes missed between render
		// and attach.
		scheduler.maybeScheduleEffect()
		return () => {
			scheduler.detach()
		}
	}, [scheduler])

	return scheduler.execute()
}
