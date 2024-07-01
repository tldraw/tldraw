export function throttle(fn: () => void, limit: number) {
	let waiting = false
	let invokeOnTail = false
	return () => {
		if (!waiting) {
			fn()
			waiting = true
			setTimeout(() => {
				waiting = false
				if (invokeOnTail) {
					invokeOnTail = false
					fn()
				}
			}, limit)
		} else {
			invokeOnTail = true
		}
	}
}
