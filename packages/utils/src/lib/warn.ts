const usedWarnings = new Set<string>()

/**
 * Issues a deprecation warning for deprecated getter properties, advising users to use
 * the equivalent getter method instead. The warning is shown only once per property name.
 *
 * @param name - The name of the deprecated property (e.g., 'viewport')
 *
 * @example
 * ```ts
 * // Inside a class with deprecated property access
 * get viewport() {
 *   warnDeprecatedGetter('viewport')
 *   return this.getViewport()
 * }
 *
 * // Usage will show: "[tldraw] Using 'viewport' is deprecated and will be removed..."
 * // But only the first time it's accessed
 * ```
 *
 * @internal
 */
export function warnDeprecatedGetter(name: string) {
	warnOnce(
		`Using '${name}' is deprecated and will be removed in the near future. Please refactor to use 'get${name[0].toLocaleUpperCase()}${name.slice(
			1
		)}' instead.`
	)
}

/**
 * Issues a warning message to the console, but only once per unique message.
 * Subsequent calls with the same message are ignored, preventing console spam.
 * All messages are prefixed with "[tldraw]".
 *
 * @param message - The warning message to display
 *
 * @example
 * ```ts
 * // Warn about deprecated usage
 * function oldFunction() {
 *   warnOnce('oldFunction is deprecated, use newFunction instead')
 *   // Continue with implementation...
 * }
 *
 * // First call logs: "[tldraw] oldFunction is deprecated, use newFunction instead"
 * oldFunction() // Shows warning
 * oldFunction() // No warning (already shown)
 * oldFunction() // No warning (already shown)
 * ```
 *
 * @internal
 */
export function warnOnce(message: string) {
	if (usedWarnings.has(message)) return

	usedWarnings.add(message)
	console.warn(`[tldraw] ${message}`)
}
