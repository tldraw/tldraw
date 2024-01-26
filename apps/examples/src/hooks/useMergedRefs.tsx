import { ForwardedRef, useCallback } from 'react'

export function useMergedRefs<T>(...refs: ForwardedRef<T>[]) {
	return useCallback(
		(node: T) => {
			for (const ref of refs) {
				if (typeof ref === 'function') {
					ref(node)
				} else if (ref != null) {
					ref.current = node
				}
			}
		},
		[refs]
	)
}
