import { sleep } from './control'

/**
 * Retries an async operation with configurable attempt count, wait duration, and error filtering.
 * Executes the provided async function repeatedly until it succeeds or the maximum number of attempts is reached.
 * Includes support for abort signals and custom error matching to determine which errors should trigger retries.
 *
 * @param fn - The async function to retry on failure
 * @param options - Configuration options for retry behavior:
 *   - `attempts`: Maximum number of retry attempts (default: 3)
 *   - `waitDuration`: Milliseconds to wait between retry attempts (default: 1000)
 *   - `abortSignal`: Optional AbortSignal to cancel the retry operation
 *   - `matchError`: Optional function to determine if an error should trigger a retry
 * @returns Promise that resolves with the function's return value on success
 *
 * @example
 * ```ts
 * // Basic retry with default settings (3 attempts, 1 second wait)
 * const data = await retry(async () => {
 *   const response = await fetch('/api/data')
 *   if (!response.ok) throw new Error('Network error')
 *   return response.json()
 * })
 *
 * // Custom retry configuration
 * const result = await retry(
 *   async () => unreliableApiCall(),
 *   {
 *     attempts: 5,
 *     waitDuration: 2000,
 *     matchError: (error) => error instanceof NetworkError
 *   }
 * )
 *
 * // With abort signal for cancellation
 * const controller = new AbortController()
 * setTimeout(() => controller.abort(), 10000) // Cancel after 10 seconds
 *
 * const data = await retry(
 *   async () => fetchData(),
 *   {
 *     attempts: 10,
 *     abortSignal: controller.signal
 *   }
 * )
 * ```
 *
 * @internal
 */
export async function retry<T>(
	fn: () => Promise<T>,
	{
		attempts = 3,
		waitDuration = 1000,
		abortSignal,
		matchError,
	}: {
		attempts?: number
		waitDuration?: number
		abortSignal?: AbortSignal
		matchError?(error: unknown): boolean
	} = {}
): Promise<T> {
	let error: unknown = null
	for (let i = 0; i < attempts; i++) {
		if (abortSignal?.aborted) throw new Error('aborted')
		try {
			return await fn()
		} catch (e) {
			if (matchError && !matchError(e)) throw e
			error = e
			await sleep(waitDuration)
		}
	}
	throw error
}
