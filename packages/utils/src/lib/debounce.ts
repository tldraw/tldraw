import { promiseWithResolve } from './control'
import { noop } from './function'
import type { Awaitable } from './types'

interface DebounceState<T extends unknown[], U> {
	// eslint-disable-next-line no-restricted-globals
	timeout?: ReturnType<typeof setTimeout>
	deferred: Promise<U> & {
		resolve(value: Awaitable<U>): void
		reject(reason?: any): void
	}
	latestArgs: T
}

/**
 * Create a debounced version of a function that delays execution until after a specified wait time.
 *
 * Debouncing ensures that a function is only executed once after a specified delay,
 * even if called multiple times in rapid succession. Each new call resets the timer. The debounced
 * function returns a Promise that resolves with the result of the original function. Includes a
 * cancel method to prevent execution if needed.
 *
 * Cancel a pending call with the `cancel()` method, or by passing an `AbortSignal` via the
 * `signal` option and aborting it. Both reject any pending promise with the cancellation reason
 * (an `AbortError` by default for an aborted signal). Callers that discard the promise are not
 * affected — internal handling suppresses the unhandled-rejection warning — but any code that
 * `await`s or chains `.then()` on the promise must be prepared to handle the rejection.
 *
 * @param callback - The function to debounce (can be sync or async)
 * @param wait - The delay in milliseconds before executing the function
 * @param opts - Optional options. Pass `signal` to cancel the debounced function when the
 *   `AbortSignal` aborts.
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
 * // Cancel pending execution
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
 *
 * // Tie the debounced function to an AbortSignal — aborting cancels it
 * const controller = new AbortController()
 * const debouncedSave = debounce(saveDraft, 500, { signal: controller.signal })
 * debouncedSave(draft)
 * controller.abort() // rejects the pending promise and stops the scheduled call
 * ```
 *
 * @public
 * @see source - https://gist.github.com/ca0v/73a31f57b397606c9813472f7493a940
 */
export function debounce<T extends unknown[], U>(
	callback: (...args: T) => Awaitable<U>,
	wait: number,
	opts?: { signal?: AbortSignal }
): {
	(...args: T): Promise<U>
	/**
	 * Cancel the pending debounced call, rejecting its promise. Alternatively, pass an
	 * `AbortSignal` via the `signal` option and abort it.
	 */
	cancel(): void
} {
	const externalSignal = opts?.signal
	let state: DebounceState<T, U> | undefined

	// Both cancellation paths — the deprecated `.cancel()` and an aborted external `signal` — run
	// through here: clear the pending timer and reject the in-flight promise with `reason`. A call
	// afterwards starts a fresh window.
	function cancel(reason: unknown) {
		if (!state) return
		const { timeout, deferred } = state
		state = undefined
		clearTimeout(timeout)
		// Attach a no-op handler so callers that discarded the promise don't trigger an
		// unhandled-rejection warning. Consumers that did `.then`, `.catch`, or `await` on the
		// returned promise still observe the rejection through their own chain.
		deferred.catch(noop)
		deferred.reject(reason)
	}

	const fn = (...args: T): Promise<U> => {
		if (externalSignal?.aborted) {
			// The signal already aborted, so never schedule. Attach a no-op handler so callers that
			// discard the promise don't trigger an unhandled-rejection warning.
			const rejected = Promise.reject(externalSignal.reason)
			rejected.catch(noop)
			return rejected
		}
		if (!state) {
			state = { deferred: promiseWithResolve<U>(), latestArgs: args }
		}
		clearTimeout(state.timeout)
		state.latestArgs = args
		// eslint-disable-next-line no-restricted-globals
		state.timeout = setTimeout(() => {
			const s = state!
			state = undefined
			try {
				s.deferred.resolve(callback(...s.latestArgs))
			} catch (e) {
				s.deferred.reject(e)
			}
		}, wait)

		return state.deferred
	}

	fn.cancel = () => cancel(new Error('Debounced function was cancelled'))

	// An external signal cancels the in-flight call. `{ once: true }` is enough cleanup — an
	// AbortSignal only ever fires `abort` once.
	externalSignal?.addEventListener('abort', () => cancel(externalSignal.reason), { once: true })

	return fn
}
