/**
 * Converts a fairy name into an IRC-style screen name while preserving identity.
 * Uses the first name + deterministic decorations based on agentId.
 *
 * "Steve Mossgrain" (agent123) → "xXSteveXx" or "Steve_99" etc.
 */
export function getIRCNameForFairy(fairyName: string, agentId: string): string {
	const firstName = fairyName.trim().split(/\s+/)[0]

	// Use agentId to deterministically pick a pattern
	let hash = 0
	for (let i = 0; i < agentId.length; i++) {
		hash = (hash << 5) - hash + agentId.charCodeAt(i)
		hash = hash & hash
	}

	const patternIndex = Math.abs(hash) % PATTERNS.length
	const suffixIndex = Math.abs(hash >> 4) % SUFFIXES.length

	return PATTERNS[patternIndex](firstName, SUFFIXES[suffixIndex])
}

// Patterns that incorporate the fairy's first name
const PATTERNS = [
	// xXNameXx style
	(name: string) => `xX${name}Xx`,
	// ~*Name*~ style
	(name: string) => `~*${name}*~`,
	// Name + suffix
	(name: string, suffix: string) => `${name}${suffix}`,
	// Name_ + suffix
	(name: string, suffix: string) => `${name}_${suffix}`,
	// lowercase + suffix
	(name: string, suffix: string) => `${name.toLowerCase()}${suffix}`,
	// [Name] style
	(name: string) => `[${name}]`,
	// Name-x style
	(name: string, suffix: string) => `${name}-${suffix}`,
	// _Name_ style
	(name: string) => `_${name}_`,
]

const SUFFIXES = [
	'69',
	'420',
	'99',
	'2000',
	'2003',
	'xo',
	'xx',
	'x',
	'13',
	'666',
	'777',
	'_xo',
	'ღ',
	'♥',
]
