import { HistoryAuthor } from '@tldraw/dotcom-shared'

/** "Only my changes": agent edits carry the user they acted for, so they count as the user's. */
export function byAuthor(userId: string | null) {
	return (entry: { authors: HistoryAuthor[] }) =>
		userId === null || entry.authors.some((a) => a.userId === userId)
}

/** Values for the authors message, the same shape reactions use: "A, B, C and 2 others". */
export function authorListValues(names: string[]) {
	return {
		count: names.length,
		a: names[0] ?? '',
		b: names[1] ?? '',
		c: names[2] ?? '',
		others: Math.max(0, names.length - 3),
	}
}

export function byNamed(onlyNamed: boolean) {
	return (entry: { name?: string }) => !onlyNamed || !!entry.name
}
