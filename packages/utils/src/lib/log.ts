const usedWarnings = new Set<string>()

/**
 * @internal
 */
export function warnDeprecatedGetter(name: string) {
	const newName = `get${name[0].toLocaleUpperCase()}${name.slice(1)}`
	warnOnce(
		`deprecatedGetter:${name}`,
		`Using '${name}' is deprecated and will be removed in the near future. Please refactor to use '${newName}' instead.`
	)
}

/** @internal */
export function warnOnce(message: string): void
/** @internal */
export function warnOnce(key: string, message: string): void
/** @internal */
export function warnOnce(key: string, message?: string) {
	if (message === undefined) {
		message = key
	}

	if (usedWarnings.has(key)) return
	console.warn(`[tldraw] ${message}`)
}
