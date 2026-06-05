import { noop } from './function'
import type { Awaitable } from './types'

/**
 * Create a debounced version of a function that delays execution until after a specified wait time.
 *
 * Debouncing ensures that a function is only executed once after a specified delay,
 * even if called multiple times in rapid succession. Each new call resets the timer. The debounced
 * function returns a Promise that resolves with the result of the original function. Includes a
 * cancel method to prevent execution if needed.
 *
 * Calling `cancel()` while a call is pending rejects the returned promise with an `Error`
 * whose message is `'Debounced function was cancelled'`. Callers that discard the promise
 * are not affected — internal handling suppresses the unhandled-rejection warning — but
 * any code that `await`s or chains `.then()` on the promise must be prepared to handle the
 * rejection.
 *
 * @param callback - The function to debounce (can be sync or async)
 * @param wait - The delay in milliseconds before executing the function
 * @returns A debounced function that returns a Promise and includes a cancel method
 *
 * @example
 * ```ts
 * // Debounce a search function
 * const searchAPI = (query: string) => fetch(`/search?q=${query}`)
 * const debouncedSearch = debounce(searchAPI, 300)
 *
 * // Multiple rapid calls will only execute the last one after 300ms
 * debouncedSearch('react').then(result => console.log(result))
 * debouncedSearch('react hooks') // This cancels the previous call
 * debouncedSearch('react typescript') // Only this will execute
 *
 * // Cancel pending execution — any in-flight promise rejects
 * debouncedSearch.cancel()
 *
 * // With async/await — wrap in try/catch if you might cancel
 * const saveData = debounce(async (data: any) => {
 *   return await api.save(data)
 * }, 1000)
 *
 * try {
 *   const result = await saveData({name: 'John'})
 * } catch (err) {
 *   // handle cancellation or callback error
 * }
 * ```
 *
 * @public
 * @see source - https://gist.github.com/ca0v/73a31f57b397606c9813472f7493a940
 */
export function debounce<T extends unknown[], U>(
	callback: (...args: T) => Awaitable<U>,
	wait: number
) {
	let state:
		| undefined
		| {
				// eslint-disable-next-line no-restricted-globals
				timeout: ReturnType<typeof setTimeout>
				promise: Promise<U>
				resolve(value: U | PromiseLike<U>): void
				reject(value: any): void
				latestArgs: T
		  } = undefined

	const fn = (...args: T): Promise<U> => {
		if (!state) {
			state = {} as any
			state!.promise = new Promise((resolve, reject) => {
				state!.resolve = resolve
				state!.reject = reject
			})
		}
		clearTimeout(state!.timeout)
		state!.latestArgs = args
		// It's up to the consumer of debounce to call `cancel`
		// eslint-disable-next-line no-restricted-globals
		state!.timeout = setTimeout(() => {
			const s = state!
			state = undefined
			try {
				s.resolve(callback(...s.latestArgs))
			} catch (e) {
				s.reject(e)
			}
		}, wait)

		return state!.promise
	}
	fn.cancel = () => {
		if (!state) return
		clearTimeout(state.timeout)
		const s = state
		state = undefined
		// Attach a no-op handler so callers that discard the promise don't
		// trigger an unhandled-rejection warning. Consumers that did `.then`,
		// `.catch`, or `await` on the returned promise still observe the
		// rejection through their own chain.
		s.promise.catch(noop)
		s.reject(new Error('Debounced function was cancelled'))
	}
	return fn
}
