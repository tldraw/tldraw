/**
 * Flag to track whether the computed getter deprecation warning has already been shown.
 * Prevents the same warning from being logged multiple times during application runtime.
 *
 * @internal
 */
let didWarnComputedGetter = false

/**
 * Logs a deprecation warning for the deprecated `@computed` getter decorator syntax.
 * This function is called internally when the library detects usage of `@computed`
 * on a getter method instead of the recommended method syntax.
 *
 * The warning is only shown once per application session to avoid spam in the console.
 * It provides clear guidance on how to migrate from the deprecated getter syntax
 * to the current method-based approach.
 *
 * @example
 * ```ts
 * // Deprecated pattern that triggers this warning:
 * class MyClass {
 *   @computed
 *   get value() {
 *     return this.someAtom.get()
 *   }
 * }
 *
 * // Recommended pattern:
 * class MyClass {
 *   @computed
 *   getValue() {
 *     return this.someAtom.get()
 *   }
 * }
 * ```
 *
 * @internal
 */
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
