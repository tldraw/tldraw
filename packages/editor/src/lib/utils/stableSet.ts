/**
 * `previous` if it holds exactly the same members as `next`, otherwise `next`. Keeping the
 * identity of an unchanged set lets consumers compare with `===`.
 */
export function stableSet<T>(previous: Set<T> | null, next: Set<T>): Set<T> {
	if (!previous) return next

	// If sizes differ, contents must differ
	if (previous.size !== next.size) return next

	for (const id of previous) {
		if (!next.has(id)) return next
	}

	return previous
}
