import { assert } from '@tldraw/utils'
import { useCallback, useDebugValue, useLayoutEffect, useRef } from 'react'

/**
 * Allows you to define event handlers that can read the latest props/state but has a stable
 * function identity.
 *
 * These event callbacks may not be called in React render functions! An error won't be thrown, but
 * in the real implementation it would be!
 *
 * Uses a modified version of the user-land implementation included in the [`useEvent()` RFC][1].
 * Our version until such a hook is available natively.
 *
 * The RFC was closed on 27 September 2022, the React team plans to come up with a new RFC to
 * provide similar functionality in the future. We will migrate to this functionality when
 * available.
 *
 * IMPORTANT CAVEAT: You should not call event callbacks in layout effects of React component
 * children! Internally this hook uses a layout effect and parent component layout effects run after
 * child component layout effects. Use this hook responsibly.
 *
 * [1]: https://github.com/reactjs/rfcs/pull/220
 *
 * @internal
 */
export function useEvent<Args extends Array<unknown>, Result>(
	handler: (...args: Args) => Result
): (...args: Args) => Result {
	const handlerRef = useRef<(...args: Args) => Result>()

	// In a real implementation, this would run before layout effects
	useLayoutEffect(() => {
		handlerRef.current = handler
	})

	useDebugValue(handler)

	return useCallback((...args: Args) => {
		// In a real implementation, this would throw if called during render
		const fn = handlerRef.current
		assert(fn, 'fn does not exist')
		return fn(...args)
	}, [])
}
