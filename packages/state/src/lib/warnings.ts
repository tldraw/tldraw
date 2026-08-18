import { warnOnce } from '@tldraw/utils'

/**
 * Warns (once) that the `@computed` getter decorator form is deprecated in favor of methods.
 *
 * @internal
 */
export function logComputedGetterWarning() {
	warnOnce(
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
