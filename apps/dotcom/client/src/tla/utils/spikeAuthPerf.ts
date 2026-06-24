// SPIKE INSTRUMENTATION — not for merge.
// Measures the auth cost on the file-navigation critical path so the three
// spike branches can be compared. Logs to the console under the [spike-auth] tag.
/* eslint-disable no-console */

/** Time an async step (e.g. fetching the auth token) and log how long it took. */
export async function timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
	const start = performance.now()
	try {
		return await fn()
	} finally {
		console.log(`[spike-auth] ${label}: ${(performance.now() - start).toFixed(1)}ms`)
	}
}

/** Log elapsed time since a captured `performance.now()` mark. */
export function logElapsed(label: string, sinceMs: number) {
	console.log(`[spike-auth] ${label}: ${(performance.now() - sinceMs).toFixed(1)}ms`)
}
