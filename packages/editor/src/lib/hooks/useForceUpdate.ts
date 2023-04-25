import { useEffect, useState } from 'react'

/** @public */
export function useForceUpdate() {
	const [_, ss] = useState(0)
	useEffect(() => ss((s) => s + 1), [])
}
