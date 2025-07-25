/* eslint-disable prefer-rest-params */
import { Signal, computed, react } from '@tldraw/state'
import { useMemo, useSyncExternalStore } from 'react'

/** @public */
export function useValue<Value>(value: Signal<Value>): Value

/**
 * Extracts the value from a signal and subscribes to it.
 *
 * Note that you do not need to use this hook if you are wrapping the component with {@link track}
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
 * You can also pass a function to compute the value and it will be memoized as in `useComputed`:
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
export function useValue<Value>(name: string, fn: () => Value, deps: unknown[]): Value

/** @public */
export function useValue() {
	const args = arguments
	// deps will be either the computed or the deps array
	const deps = args.length === 3 ? args[2] : [args[0]]
	const name = args.length === 3 ? args[0] : `useValue(${args[0].name})`

	const { $val, subscribe, getSnapshot } = useMemo(() => {
		const $val =
			args.length === 1 ? (args[0] as Signal<any>) : (computed(name, args[1]) as Signal<any>)

		return {
			$val,
			subscribe: (notify: () => void) => {
				return react(`useValue(${name})`, () => {
					try {
						$val.get()
					} catch {
						// Will be rethrown during render if the component doesn't unmount first.
					}
					notify()
				})
			},
			getSnapshot: () => $val.lastChangedEpoch,
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)

	useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
	return $val.__unsafe__getWithoutCapture()
}
