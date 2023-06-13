/**
 * Throttle a function.
 *
 * @example
 *
 * ```ts
 * const A = throttle(myFunction, 1000)
 * ```
 *
 * @public
 * @see source - https://github.com/bameyrick/throttle-typescript
 */
export function throttle<T extends (...args: any) => any>(
	func: T,
	limit: number
): (...args: Parameters<T>) => ReturnType<T> {
	let inThrottle: boolean
	let lastResult: ReturnType<T>
	return function (this: any, ...args: any[]): ReturnType<T> {
		if (!inThrottle) {
			inThrottle = true
			setTimeout(() => (inThrottle = false), limit)
			lastResult = func(...args)
		}
		return lastResult
	}
}

/**
 * When a function is wrapped in `omitFromStackTrace`, if it throws an error the stack trace won't
 * include the function itself or any stack frames above it. Useful for assertion-style function
 * where the error will ideally originate from the call-site rather than within the implementation
 * of the assert fn.
 *
 * Only works in platforms that support `Error.captureStackTrace` (ie v8).
 *
 * @internal
 */
export function omitFromStackTrace<Args extends Array<unknown>, Return>(
	fn: (...args: Args) => Return
): (...args: Args) => Return {
	const wrappedFn = (...args: Args) => {
		try {
			return fn(...args)
		} catch (error) {
			if (error instanceof Error && Error.captureStackTrace) {
				Error.captureStackTrace(error, wrappedFn)
			}
			throw error
		}
	}

	return wrappedFn
}

/**
 * Does nothing, but it's really really good at it.
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop(): void {}
