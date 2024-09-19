let didWarnComputedGetter = false

export function logComputedGetterWarning() {
	if (didWarnComputedGetter) return
	didWarnComputedGetter = true
	console.warn(
		`Using \`@computed\` as a decorator for getters is deprecated and will be removed in the near future. Please refactor to use \`@computed\` as a decorator for methods.

// Before
@computed
get foo() {
	return 'foo'
}

// After
@computed
getFoo() {
	return 'foo'
}
`
	)
}
