import React from 'react'
import { EffectScheduler } from '../core'

/** @internal */
export function useStateTracking<T>(name: string, render: () => T): T {
	// user render is only called at the bottom of this function, indirectly via scheduler.execute()
	// we need it to always be up-to-date when calling scheduler.execute() but it'd be wasteful to
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
	}, [name])

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
