import { useEffect, useRef } from 'react'

/** @internal */
export function usePrevious<T>(value: T) {
	const ref = useRef(value)
	useEffect(() => {
		ref.current = value
	})
	return ref.current
}
