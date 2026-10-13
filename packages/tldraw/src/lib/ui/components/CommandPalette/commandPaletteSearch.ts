/** @internal */
export function normalizeCommandPaletteText(text: string) {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

function isWordStart(text: string, index: number) {
	return index === 0 || !/[\p{L}\p{N}]/u.test(text[index - 1])
}

function includesAtWordStart(text: string, word: string) {
	for (let i = text.indexOf(word); i !== -1; i = text.indexOf(word, i + 1)) {
		if (isWordStart(text, i)) return true
	}
	return false
}

/**
 * Scores a query against an item label (and path): 5 exact, 4 prefix, 3 word-start, 2 word match,
 * 1 path match, 0 none. An empty query scores 0.
 *
 * @public
 */
export function getCommandPaletteMatchScore(
	query: string,
	label: string,
	path: readonly string[] = []
): number {
	const normalizedQuery = normalizeCommandPaletteText(query)
	if (!normalizedQuery) return 0
	const normalizedLabel = normalizeCommandPaletteText(label)
	if (normalizedLabel === normalizedQuery) return 5
	if (normalizedLabel.startsWith(normalizedQuery)) return 4
	const words = normalizedQuery.split(/\s+/)
	if (words.every((word) => includesAtWordStart(normalizedLabel, word))) return 3
	if (words.every((word) => normalizedLabel.includes(word))) return 2
	const normalizedPath = normalizeCommandPaletteText(path.join(' '))
	if (words.every((word) => normalizedLabel.includes(word) || normalizedPath.includes(word))) {
		return 1
	}
	return 0
}

/** @internal */
export interface CommandPaletteRankable {
	id: string
	label: string
	/** The label without any submenu prefix. */
	name?: string
	path: readonly string[]
	disabled: boolean
}

// An exact match on the bare name ("dark") must stay near the top even though the displayed label
// is prefixed ("Theme: Dark"), but not outrank a displayed label that matches exactly.
function getEntryScore(query: string, entry: CommandPaletteRankable) {
	const score = getCommandPaletteMatchScore(query, entry.label, entry.path)
	if (entry.name === undefined || entry.name === entry.label) return score
	return getCommandPaletteMatchScore(query, entry.name) === 5 ? Math.max(score, 4) : score
}

/** @internal */
export function rankCommandPaletteEntries<T extends CommandPaletteRankable>(
	entries: readonly T[],
	query: string,
	recentIds: readonly string[]
): T[] {
	const recency = (id: string) => {
		const index = recentIds.indexOf(id)
		return index === -1 ? recentIds.length : index
	}
	return entries
		.map((entry, index) => ({
			entry,
			index,
			score: getEntryScore(query, entry),
		}))
		.filter(({ score }) => score > 0)
		.sort(
			(a, b) =>
				Number(a.entry.disabled) - Number(b.entry.disabled) ||
				b.score - a.score ||
				recency(a.entry.id) - recency(b.entry.id) ||
				a.index - b.index
		)
		.map(({ entry }) => entry)
}
