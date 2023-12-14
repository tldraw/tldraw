/* eslint-disable prefer-rest-params */
import { useMemo } from 'react'
import { Computed, ComputedOptions, computed } from '../core'

/**
 * Creates a new computed signal and returns it. The computed signal will be created only once.
 *
 * See [[computed]]
 *
 * @example
 * ```ts
 * type GreeterProps = {
 *   firstName: Signal<string>
 *   lastName: Signal<string>
 * }
 *
 * const Greeter = track(function Greeter ({firstName, lastName}: GreeterProps) {
 *   const fullName = useComputed('fullName', () => `${firstName.get()} ${lastName.get()}`)
 *   return <div>Hello {fullName.get()}!</div>
 * })
 * ```
 *
 * @public
 */
export function useComputed<Value>(name: string, compute: () => Value, deps: any[]): Computed<Value>
/** @public */
export function useComputed<Value, Diff = unknown>(
	name: string,
	compute: () => Value,
	opts: ComputedOptions<Value, Diff>,
	deps: any[]
): Computed<Value>
/** @public */
export function useComputed() {
	const name = arguments[0]
	const compute = arguments[1]
	const opts = arguments.length === 3 ? undefined : arguments[2]
	const deps = arguments.length === 3 ? arguments[2] : arguments[3]
	// eslint-disable-next-line react-hooks/exhaustive-deps
	return useMemo(() => computed(`useComputed(${name})`, compute, opts), deps)
}
