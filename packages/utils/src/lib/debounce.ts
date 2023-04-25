/**
 * Debounce a function.
 *
 * @example
 *
 * ```ts
 * const A = debounce(myFunction, 1000)
 * ```
 *
 * @public
 * @see source - https://gist.github.com/ca0v/73a31f57b397606c9813472f7493a940
 */
export function debounce<T extends unknown[], U>(
	callback: (...args: T) => PromiseLike<U> | U,
	wait: number
) {
	let state:
		| undefined
		| {
				timeout: ReturnType<typeof setTimeout>
				promise: Promise<U>
				resolve: (value: U | PromiseLike<U>) => void
				reject: (value: any) => void
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
	}
	return fn
}
