import { retry } from '@tldraw/utils'

export function retryOnConnectionFailure<T>(fn: () => Promise<T>): Promise<T> {
	return retry(fn, {
		attempts: 5,
		waitDuration: 500,
		matchError: (error: unknown) => {
			return !!error?.toString?.().match(/connection/i)
		},
	})
}
