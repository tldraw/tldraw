/* eslint-disable prefer-rest-params */
import { useMemo, useRef, useSyncExternalStore } from 'react'
import { Signal, computed, react } from '../core'

/**
 * Extracts the value from a signal and subscribes to it.
 *
 * Note that you do not need to use this hook if you are wrapping the component with [[track]]
 *
 * @example
 * ```ts
 * const Counter: React.FC = () => {
 *   const $count = useAtom('count', 0)
 *   const increment = useCallback(() => $count.set($count.get() + 1), [count])
 *   const currentCount = useValue($count)
 *   return <button onClick={increment}>{currentCount}</button>
 * }
 * ```
 *
 * You can also pass a function to compute the value and it will be memoized as in [[useComputed]]:
 *
 * @example
 * ```ts
 * type GreeterProps = {
 *   firstName: Signal<string>
 *   lastName: Signal<string>
 * }
 *
 * const Greeter = track(function Greeter({ firstName, lastName }: GreeterProps) {
 *   const fullName = useValue('fullName', () => `${firstName.get()} ${lastName.get()}`, [
 *     firstName,
 *     lastName,
 *   ])
 *   return <div>Hello {fullName}!</div>
 * })
 * ```
 *
 * @public
 */
export function useValue<Value>(value: Signal<Value>): Value
/** @public */
export function useValue<Value>(name: string, fn: () => Value, deps: unknown[]): Value
/** @public */
export function useValue() {
	const args = arguments
	// deps will be either the computed or the deps array
	const deps = args.length === 3 ? args[2] : [args[0]]
	const name = args.length === 3 ? args[0] : `useValue(${args[0].name})`

	const isInRender = useRef(true)
	isInRender.current = true

	const $val = useMemo(() => {
		if (args.length === 1) {
			return args[0]
		}
		return computed(name, () => {
			if (isInRender.current) {
				return args[1]()
			} else {
				try {
					return args[1]()
				} catch {
					// when getSnapshot is called outside of the render phase &
					// subsequently throws an error, it might be because we're
					// in a zombie-child state. in that case, we suppress the
					// error and instead return a new dummy value to trigger a
					// react re-render. if we were in a zombie child, react will
					// unmount us instead of re-rendering so the error is
					// irrelevant. if we're not in a zombie-child, react will
					// call `getSnapshot` again in the render phase, and the
					// error will be thrown as expected.å
					return {}
				}
			}
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)

	try {
		const { subscribe, getSnapshot } = useMemo(() => {
			return {
				subscribe: (listen: () => void) => {
					return react(`useValue(${name})`, () => {
						$val.get()
						listen()
					})
				},
				getSnapshot: () => $val.get(),
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [$val])

		return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
	} finally {
		isInRender.current = false
	}
}
