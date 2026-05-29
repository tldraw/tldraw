/**
 * Console logging for cross-tab role transitions (leader / presenter), so the
 * behavior is observable while moving focus between tabs and windows. The
 * short tab id makes it easy to tell tabs apart when their consoles are open
 * side by side.
 *
 * Uses `console.debug`, which browsers hide unless the devtools log level
 * includes "Verbose" — so this stays out of the default console (cross-tab is
 * on by default) while remaining one toggle away. Silent under test to keep
 * the suite output clean.
 *
 * @internal
 */
export function logCrossTabRole(tabId: string, message: string) {
	if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') return
	// eslint-disable-next-line no-console
	console.debug(
		`%c[tldraw cross-tab ${tabId.slice(0, 6)}]`,
		'color: #8b5cf6; font-weight: bold',
		message
	)
}
