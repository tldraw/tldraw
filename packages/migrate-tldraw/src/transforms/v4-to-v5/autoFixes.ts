/**
 * v4 → v5 deterministic auto-fixes.
 *
 * Only the three known-safe forms of `inferDarkMode` are auto-rewritten:
 *
 *   <Tldraw inferDarkMode />               → <Tldraw colorScheme="system" />
 *   <Tldraw inferDarkMode={true} />        → <Tldraw colorScheme="system" />
 *   <Tldraw inferDarkMode="dark" />        → <Tldraw colorScheme="dark" />  (string-literal value)
 *
 * Anything with a non-literal value (`inferDarkMode={prefersDark}`,
 * `inferDarkMode={false}`) becomes a flag instead, because the value type
 * changed from `boolean` to `'light' | 'dark' | 'system'` and a blind rename
 * would silently break runtime behaviour. See the prior review's B1/B2.
 */

import type { AutoFix } from '../../lib/types'

export const v4ToV5AutoFixes: AutoFix[] = [
	{
		kind: 'auto',
		id: 'infer-dark-mode-bare',
		name: 'inferDarkMode (bare prop) → colorScheme="system"',
		// The prop is bare when the next non-whitespace character closes the JSX
		// element (`>`, `/`) or starts another prop. We deliberately exclude `=`
		// from the lookahead so `inferDarkMode={…}` and `inferDarkMode=…` do
		// not match here.
		pattern: /\binferDarkMode(?=\s|\/|>)/g,
		replacement: 'colorScheme="system"',
		note: 'Bare inferDarkMode prop renamed; behaviour preserved (`system`).',
	},
	{
		kind: 'auto',
		id: 'infer-dark-mode-true',
		name: 'inferDarkMode={true} → colorScheme="system"',
		pattern: /\binferDarkMode=\{true\}/g,
		replacement: 'colorScheme="system"',
		note: 'inferDarkMode={true} renamed; behaviour preserved (`system`).',
	},
	{
		kind: 'auto',
		id: 'infer-dark-mode-string-literal',
		name: 'inferDarkMode="…" → colorScheme="…"',
		// String-literal value: rename only. We don't rewrite values; if the user
		// had inferDarkMode="dark" (which v4 didn't actually accept), the literal
		// passes straight through as colorScheme="dark", which IS a valid v5 value.
		pattern: /\binferDarkMode=("(?:light|dark|system)")/g,
		replacement: 'colorScheme=$1',
		note: 'String-literal inferDarkMode renamed to colorScheme.',
	},
]
