import { getFromLocalStorage, setInLocalStorage } from '@tldraw/utils'
import { useCallback, useLayoutEffect, useState } from 'react'

/**
 * Helper for dealing with values stored in local storage
 *
 * @param key - The key of the state we are interested in.
 * @param defaultValue - The default value to use if there is no value in local storage.
 * @param initialValue - The initial value to use before reading from local storage. `undefined` is not supported.
 * @returns A tuple containing the current state and a function to update the state.
 *
 * @public
 */
export function useLocalStorageState<T = any>(key: string, defaultValue: T) {
	const [isLoaded, setIsLoaded] = useState(false)
	const [state, setState] = useState<T>(defaultValue)

	useLayoutEffect(() => {
		const value = getFromLocalStorage(key)
		if (value) {
			try {
				setState(JSON.parse(value))
			} catch {
				console.error(`Could not restore value ${key} from local storage.`)
			}
		}
		setIsLoaded(true)
	}, [key])

	const updateValue = useCallback(
		(setter: T | ((value: T) => T)) => {
			setState((s) => {
				const value = typeof setter === 'function' ? (setter as any)(s) : setter
				setInLocalStorage(key, JSON.stringify(value))
				return value
			})
		},
		[key]
	)

	return [state, updateValue, isLoaded] as const
}
