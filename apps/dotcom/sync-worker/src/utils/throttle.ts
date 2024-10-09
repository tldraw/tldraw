export function throttle(fn: () => void, limit: number, { trailingOnly = false } = {}) {
	let waiting = false
	let invokeOnTail = false
	return () => {
		if (!waiting) {
			if (!trailingOnly) {
				fn()
			} else {
				invokeOnTail = true
			}
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
