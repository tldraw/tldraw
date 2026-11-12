/**
 * Maps each value through `map`, at most `limit` at a time, and resolves with the results in the
 * values' order. If one fails, no more are started, and once those under way have settled it
 * rejects with the first error, so a caller can clean up after everything that ran.
 */
export async function mapConcurrently<T, R>(
	values: readonly T[],
	limit: number,
	map: (value: T, index: number) => Promise<R>
): Promise<R[]> {
	const results = new Array<R>(values.length)
	let next = 0
	let failure: { error: unknown } | undefined
	const run = async () => {
		while (next < values.length && !failure) {
			const index = next++
			try {
				results[index] = await map(values[index], index)
			} catch (error) {
				failure ??= { error }
			}
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, values.length) }, run))
	if (failure) throw failure.error
	return results
}
