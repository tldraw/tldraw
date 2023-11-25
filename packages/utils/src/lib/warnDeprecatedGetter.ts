const warnedNames = new Set<string>()

/**
 * @internal
 */
export function warnDeprecatedGetter(name: string) {
	if (warnedNames.has(name)) return

	warnedNames.add(name)
	console.warn(
		`Using '${name}' is deprecated and will be removed in the near future. Please refactor to use 'get${name[0].toLocaleUpperCase()}${name.slice(
			1
		)}' instead.`
	)
}
