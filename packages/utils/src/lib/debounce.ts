/**
 * Debounce a function.
 *
 * @example
 *
 * ```ts
 * const A = debounce(myFunction, 1000)
 * const B = debounce(myFunction, 1000, { leading: true })
 * ```
 *
 * @public
 * @see source - https://gist.github.com/ca0v/73a31f57b397606c9813472f7493a940
 */
export function debounce<T extends unknown[], U>(
	callback: (...args: T) => PromiseLike<U> | U,
	wait: number,
	options: { leading?: boolean } = {}
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
		const shouldCallLeading = options.leading && !state

		if (!state) {
			state = {} as any
			state!.promise = new Promise((resolve, reject) => {
				state!.resolve = resolve
				state!.reject = reject
			})
		}

		clearTimeout(state!.timeout)
		state!.latestArgs = args

		if (shouldCallLeading) {
			try {
				const result = callback(...args)
				if (result instanceof Promise) {
						result.then(state!.resolve, state!.reject)
				} else {
						state!.resolve(result)
				}
				// We still set the timeout to clear the state after the wait period
				// eslint-disable-next-line no-restricted-globals
				state!.timeout = setTimeout(() => {
						state = undefined
				}, wait)
			} catch (e) {
					state!.reject(e)
					state = undefined
			}
		} else {
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
		}

		return state!.promise
	}
	fn.cancel = () => {
		if (!state) return
		clearTimeout(state.timeout)
		state = undefined
	}
	return fn
}
