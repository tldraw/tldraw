let _isDev = false
try {
	_isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
} catch (_e) {
	/* noop */
}
try {
	_isDev =
		_isDev ||
		(import.meta as any).env.DEV ||
		(import.meta as any).env.TEST ||
		(import.meta as any).env.MODE === 'development' ||
		(import.meta as any).env.MODE === 'test'
} catch (_e) {
	/* noop */
}

export function isDev() {
	return _isDev
}
