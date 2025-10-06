import { omitFromStackTrace } from './function'

/**
 * Represents a successful result containing a value.
 *
 * Interface for the success case of a Result type, containing the computed value.
 * Used in conjunction with ErrorResult to create a discriminated union for error handling.
 *
 * @example
 * ```ts
 * const success: OkResult<string> = { ok: true, value: 'Hello World' }
 * if (success.ok) {
 *   console.log(success.value) // 'Hello World'
 * }
 * ```
 * @public
 */
export interface OkResult<T> {
	readonly ok: true
	readonly value: T
}
/**
 * Represents a failed result containing an error.
 *
 * Interface for the error case of a Result type, containing the error information.
 * Used in conjunction with OkResult to create a discriminated union for error handling.
 *
 * @example
 * ```ts
 * const failure: ErrorResult<string> = { ok: false, error: 'Something went wrong' }
 * if (!failure.ok) {
 *   console.error(failure.error) // 'Something went wrong'
 * }
 * ```
 * @public
 */
export interface ErrorResult<E> {
	readonly ok: false
	readonly error: E
}
/**
 * A discriminated union type for handling success and error cases.
 *
 * Represents either a successful result with a value or a failed result with an error.
 * This pattern provides type-safe error handling without throwing exceptions. The 'ok' property
 * serves as the discriminant for type narrowing.
 *
 * @example
 * ```ts
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return Result.err('Division by zero')
 *   }
 *   return Result.ok(a / b)
 * }
 *
 * const result = divide(10, 2)
 * if (result.ok) {
 *   console.log(`Result: ${result.value}`) // Result: 5
 * } else {
 *   console.error(`Error: ${result.error}`)
 * }
 * ```
 * @public
 */
export type Result<T, E> = OkResult<T> | ErrorResult<E>

/**
 * Utility object for creating Result instances.
 *
 * Provides factory methods for creating OkResult and ErrorResult instances.
 * This is the preferred way to construct Result values for consistent structure.
 *
 * @example
 * ```ts
 * // Create success result
 * const success = Result.ok(42)
 * // success: OkResult<number> = { ok: true, value: 42 }
 *
 * // Create error result
 * const failure = Result.err('Invalid input')
 * // failure: ErrorResult<string> = { ok: false, error: 'Invalid input' }
 * ```
 * @public
 */
export const Result = {
	/**
	 * Create a successful result containing a value.
	 *
	 * @param value - The success value to wrap
	 * @returns An OkResult containing the value
	 */
	ok<T>(value: T): OkResult<T> {
		return { ok: true, value }
	},
	/**
	 * Create a failed result containing an error.
	 *
	 * @param error - The error value to wrap
	 * @returns An ErrorResult containing the error
	 */
	err<E>(error: E): ErrorResult<E> {
		return { ok: false, error }
	},
}

/**
 * Throws an error for unhandled switch cases in exhaustive switch statements.
 *
 * Utility function to ensure exhaustive handling of discriminated unions in switch
 * statements. When called, it indicates a programming error where a case was not handled.
 * The TypeScript 'never' type ensures this function is only reachable if all cases aren't covered.
 *
 * @param value - The unhandled value (typed as 'never' for exhaustiveness checking)
 * @param property - Optional property name to extract from the value for better error messages
 * @returns Never returns (always throws)
 *
 * @example
 * ```ts
 * type Shape = 'circle' | 'square' | 'triangle'
 *
 * function getArea(shape: Shape): number {
 *   switch (shape) {
 *     case 'circle': return Math.PI * 5 * 5
 *     case 'square': return 10 * 10
 *     case 'triangle': return 0.5 * 10 * 8
 *     default: return exhaustiveSwitchError(shape)
 *   }
 * }
 * ```
 * @internal
 */
export function exhaustiveSwitchError(value: never, property?: string): never {
	const debugValue =
		property && value && typeof value === 'object' && property in value ? value[property] : value
	throw new Error(`Unknown switch case ${debugValue}`)
}

/**
 * Assert that a value is truthy, throwing an error if it's not.
 *
 * TypeScript assertion function that throws an error if the provided value is falsy.
 * After this function executes successfully, TypeScript narrows the type to exclude falsy values.
 * Stack trace is omitted from the error for cleaner debugging.
 *
 * @param value - The value to assert as truthy
 * @param message - Optional custom error message
 *
 * @example
 * ```ts
 * const user = getUser() // User | null
 * assert(user, 'User must be logged in')
 * // TypeScript now knows user is non-null
 * console.log(user.name) // Safe to access properties
 * ```
 * @internal
 */
export const assert: (value: unknown, message?: string) => asserts value = omitFromStackTrace(
	(value, message) => {
		if (!value) {
			throw new Error(message || 'Assertion Error')
		}
	}
)

/**
 * Assert that a value is not null or undefined.
 *
 * Throws an error if the value is null or undefined, otherwise returns the value
 * with a refined type that excludes null and undefined. Stack trace is omitted for cleaner debugging.
 *
 * @param value - The value to check for null/undefined
 * @param message - Optional custom error message
 * @returns The value with null and undefined excluded from the type
 *
 * @example
 * ```ts
 * const element = document.getElementById('my-id') // HTMLElement | null
 * const safeElement = assertExists(element, 'Element not found')
 * // TypeScript now knows safeElement is HTMLElement (not null)
 * safeElement.addEventListener('click', handler) // Safe to call methods
 * ```
 * @internal
 */
export const assertExists = omitFromStackTrace(<T>(value: T, message?: string): NonNullable<T> => {
	// note that value == null is equivalent to value === null || value === undefined
	if (value == null) {
		throw new Error(message ?? 'value must be defined')
	}
	return value as NonNullable<T>
})

/**
 * Create a Promise with externally accessible resolve and reject functions.
 *
 * Creates a Promise along with its resolve and reject functions exposed as
 * properties on the returned object. This allows external code to control when the
 * Promise resolves or rejects, useful for coordination between async operations.
 *
 * @returns A Promise object with additional resolve and reject methods
 *
 * @example
 * ```ts
 * const deferred = promiseWithResolve<string>()
 *
 * // Set up the promise consumer
 * deferred.then(value => console.log(`Resolved: ${value}`))
 * deferred.catch(error => console.error(`Rejected: ${error}`))
 *
 * // Later, resolve from external code
 * setTimeout(() => {
 *   deferred.resolve('Hello World')
 * }, 1000)
 * ```
 * @internal
 */
export function promiseWithResolve<T>(): Promise<T> & {
	resolve(value: T): void
	reject(reason?: any): void
} {
	let resolve: (value: T) => void
	let reject: (reason?: any) => void
	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})
	return Object.assign(promise, {
		resolve: resolve!,
		reject: reject!,
	})
}

/**
 * Create a Promise that resolves after a specified delay.
 *
 * Utility function for introducing delays in async code. Returns a Promise
 * that resolves with undefined after the specified number of milliseconds. Useful for
 * implementing timeouts, rate limiting, or adding delays in testing scenarios.
 *
 * @param ms - The delay in milliseconds
 * @returns A Promise that resolves after the specified delay
 *
 * @example
 * ```ts
 * async function delayedOperation() {
 *   console.log('Starting...')
 *   await sleep(1000) // Wait 1 second
 *   console.log('Done!')
 * }
 *
 * // Can also be used with .then()
 * sleep(500).then(() => {
 *   console.log('Half second has passed')
 * })
 * ```
 * @internal
 */
export function sleep(ms: number): Promise<void> {
	// eslint-disable-next-line no-restricted-globals
	return new Promise((resolve) => setTimeout(resolve, ms))
}
