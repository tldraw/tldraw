let didWarn = false

export function logDotValueWarning() {
	if (didWarn) return
	didWarn = true
	console.warn(
		'Using Signal.value is deprecated and will be removed in the near future. Please use Signal.get() instead.'
	)
}
