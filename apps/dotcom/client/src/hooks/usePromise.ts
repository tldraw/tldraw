import { useEffect, useState } from 'react'

type PromiseResult<T> =
	| {
			loading: true
	  }
	| {
			loading: false
			ok: true
			value: T
	  }
	| {
			loading: false
			ok: false
			error: Error
	  }

export function usePromise<T>(cb: () => Promise<T>): PromiseResult<T> {
	const [result, setResult] = useState<PromiseResult<T>>({ loading: true })

	useEffect(() => {
		cb().then(
			(value) => setResult({ loading: false, ok: true, value }),
			(error) => setResult({ loading: false, ok: false, error })
		)
	}, [cb])

	return result
}
