const usedWarnings = new Set<string>()

/** @internal */
export function warnDeprecatedGetter(name: string) {
	warnOnce(
		`Using '${name}' is deprecated and will be removed in the near future. Please refactor to use 'get${name[0].toLocaleUpperCase()}${name.slice(
			1
		)}' instead.`
	)
}

/** @internal */
export function warnOnce(message: string) {
	if (usedWarnings.has(message)) return

	usedWarnings.add(message)
	console.warn(`[tldraw] ${message}`)
}
