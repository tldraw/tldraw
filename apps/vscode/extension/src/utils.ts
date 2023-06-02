const DEBUG_EVENTS = false

export const nicelog = (...args: any[]) => {
	if (process.env.NODE_ENV !== 'production' && DEBUG_EVENTS) {
		// eslint-disable-next-line no-console
		console.log(...args)
	}
}
