/* eslint-disable prefer-rest-params */
import { useEffect, useState } from 'react'
import { useValue } from './useValue'

/**
 * Extracts the value from a signal and subscribes to it, debouncing the value by the given number of milliseconds.
 *
 * @see [[useValue]] for more information.
 *
 * @public
 */
export function useValueDebounced<Value>(
	name: string,
	fn: () => Value,
	deps: unknown[],
	ms: number
): Value
/** @public */
export function useValueDebounced<Value>(): Value {
	const args = [...arguments].slice(0, -1) as Parameters<typeof useValue>
	const ms = arguments[arguments.length - 1] as number
	const value = useValue(...args) as Value
	const [debouncedValue, setDebouncedValue] = useState<Value>(value)

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value)
		}, ms)
		return () => clearTimeout(timer)
	}, [value, ms])

	return debouncedValue
}
