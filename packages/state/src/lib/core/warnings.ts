let didWarnDotValue = false

// remove this once we've removed all getters from our app

export function logDotValueWarning() {
	if (didWarnDotValue) return
	didWarnDotValue = true
	console.warn(
		'Using Signal.value is deprecated and will be removed in the near future. Please use Signal.get() instead.'
	)
}

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
