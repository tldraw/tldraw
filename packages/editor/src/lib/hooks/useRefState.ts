import { Dispatch, SetStateAction, useCallback, useRef, useState } from 'react'

/**
 * A `useState` that uses a `ref` to keep the state in sync with the last value assigned to it.
 *
 * This is useful when creating side-effect state that behave correctly in react strict mode. The
 * obvious way to do this is to use `useState` within a `useEffect` like this:
 *
 * ```ts
 * const [state, setState] = useState(null)
 * useEffect(() => {
 *   const thing = createSideEffectThing()
 *   setState(thing)
 *   return () => thing.destroy()
 * }, [deps])
 * ```
 *
 * The problem with this is that when initially mounting in strict mode, react will:
 * - Call the initial effect and set state with an instance
 * - Call the cleanup function and destroy the instance
 * - Call the effect again and set state with a new instance
 * - Restore the state to the first instance
 *
 * Now, our effect and our state are out of sync: the effect is using the new instance, but the
 * state contains the old instance which has been destroyed.
 *
 * Using a `ref` is a solution, as it'll always keep the value last assigned to it, so it stays in
 * sync with the effect. That's no good for rendering though, as react won't trigger a re-render
 * when the contents of the ref changes.
 *
 * This hook solves this problem by using a `ref` to keep the value in sync with the effect, and
 * a `useState` to trigger a re-render when the value changes.
 *
 * @internal
 */
export function useRefState<T>(initialValue: T): [T, Dispatch<SetStateAction<T>>] {
	const ref = useRef(initialValue)
	const [state, setState] = useState(initialValue)

	if (state !== ref.current) {
		setState(ref.current)
	}

	const update: Dispatch<SetStateAction<T>> = useCallback((value) => {
		if (typeof value === 'function') {
			ref.current = (value as any)(ref.current)
		} else {
			ref.current = value
		}

		setState(ref.current)
	}, [])

	return [state, update]
}
