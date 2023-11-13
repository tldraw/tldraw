let didWarnDotValue = false
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'
const isProd = !isDev

// remove this once we've removed all getters from our app
const ROLLOUT_OVERRIDE_REMOVE_ME = true

export function logDotValueWarning() {
	if (ROLLOUT_OVERRIDE_REMOVE_ME) return
	if (isProd) return
	if (didWarnDotValue) return
	didWarnDotValue = true
	console.warn(
		'Using Signal.value is deprecated and will be removed in the near future. Please use Signal.get() instead.'
	)
}

let didWarnComputedGetter = false

export function logComputedGetterWarning() {
	if (ROLLOUT_OVERRIDE_REMOVE_ME) return
	if (isProd) return
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
