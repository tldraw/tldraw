export function getDiff(prev: any, next: any, diff: any = {}) {
	const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)])
	for (const key of allKeys) {
		const prevValue = prev[key]
		const nextValue = next[key]
		if (prevValue !== nextValue) {
			if (typeof prevValue === 'object' && typeof nextValue === 'object') {
				getDiff(prevValue, nextValue, diff)
			} else {
				diff[key] = { prev: prev[key], next: next[key] }
			}
		}
	}
	return diff
}
