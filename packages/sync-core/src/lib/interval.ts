/**
 * Creates a repeating timer that executes a callback at regular intervals and returns a cleanup function.
 *
 * This utility function wraps the standard `setInterval`/`clearInterval` pattern into a more convenient
 * interface that returns a dispose function for cleanup. It's commonly used in the sync system for
 * periodic tasks like health checks, ping operations, and session pruning.
 *
 * @param cb - The callback function to execute at each interval
 * @param timeout - The time interval in milliseconds between callback executions
 * @returns A cleanup function that stops the interval when called
 *
 * @example
 * ```ts
 * // Create a periodic health check
 * const stopHealthCheck = interval(() => {
 *   console.log('Checking server health...')
 *   checkServerConnection()
 * }, 5000)
 *
 * // Later, stop the health check
 * stopHealthCheck()
 * ```
 *
 * @example
 * ```ts
 * // Use in a disposables array for cleanup management
 * class MyClass {
 *   private disposables = [
 *     interval(() => this.sendPing(), 30000),
 *     interval(() => this.pruneSessions(), 2000)
 *   ]
 *
 *   dispose() {
 *     this.disposables.forEach(dispose => dispose())
 *   }
 * }
 * ```
 *
 * @public
 */
export function interval(cb: () => void, timeout: number) {
	const i = setInterval(cb, timeout)
	return () => clearInterval(i)
}
