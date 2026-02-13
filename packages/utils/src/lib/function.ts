/**
 * When a function is wrapped in `omitFromStackTrace`, if it throws an error the stack trace won't
 * include the function itself or any stack frames above it. Useful for assertion-style function
 * where the error will ideally originate from the call-site rather than within the implementation
 * of the assert fn.
 *
 * Only works in platforms that support `Error.captureStackTrace` (ie v8).
 *
 * @param fn - The function to wrap and exclude from stack traces
 * @returns A wrapped version of the function that omits itself from error stack traces
 * @example
 * ```ts
 * const assertPositive = omitFromStackTrace((value: number) => {
 *   if (value <= 0) throw new Error('Value must be positive')
 *   return value
 * })
 *
 * assertPositive(-1) // Error stack trace will point to this line, not inside assertPositive
 * ```
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
export const noop: () => void = () => {}
