import { retry } from '@tldraw/utils'

export function retryOnConnectionFailure<T>(
	fn: () => Promise<T>,
	writeRetryEvent?: () => void
): Promise<T> {
	return retry(fn, {
		attempts: 5,
		waitDuration: 500,
		matchError: (error: unknown) => {
			writeRetryEvent?.()
			return !!error?.toString?.().match(/connection/i)
		},
	})
}
