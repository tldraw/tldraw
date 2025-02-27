import { sleep } from './control'

/** @internal */
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
