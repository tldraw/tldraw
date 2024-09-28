function format(prefix: string, key: string) {
	if (prefix && prefix !== '') {
		return `${prefix}/${key}`
	}
	return key
}

export function getDiff(prev: any, next: any, prefix = '', diff: any = {}) {
	const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)])
	if (prefix === '') {
		diff['id'] = { prev: prev.id, next: next.id }
	}
	for (const key of allKeys) {
		const prevValue = prev[key]
		const nextValue = next[key]
		const keyPath = format(prefix, key)
		if (prevValue !== nextValue) {
			if (typeof prevValue === 'object' && typeof nextValue === 'object') {
				getDiff(prevValue, nextValue, keyPath, diff)
			} else {
				diff[keyPath] = { prev: prev[key], next: next[key] }
			}
		}
	}
	return diff
}
