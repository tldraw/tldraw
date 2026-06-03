import { TLTableShape } from '@tldraw/editor'

/**
 * A structural change to a table's skeleton, expressed as index maps. For each
 * axis, `map[oldIndex]` is the item's new index, or `null` if it was removed.
 * Consumers that store positional references (e.g. an `=B5` formula) use this to
 * rewrite them after an insert/delete — the SDK ships the diff; the rewriting (and
 * formulas themselves) stay consumer-owned.
 *
 * @public
 */
export interface TableStructureChange {
	rows: (number | null)[]
	cols: (number | null)[]
}

function axisMap(prev: { id: string }[], next: { id: string }[]): (number | null)[] {
	const newIndexById = new Map(next.map((item, i) => [item.id, i]))
	return prev.map((item) => {
		const i = newIndexById.get(item.id)
		return i === undefined ? null : i
	})
}

const isIdentity = (map: (number | null)[], nextLength: number) =>
	map.length === nextLength && map.every((n, i) => n === i)

/**
 * Diff two versions of a table's skeleton (anchored by stable row/column ids).
 * Returns the per-axis index maps, or `null` if nothing structural changed. Pure.
 *
 * @public
 */
export function diffTableStructure(
	prev: TLTableShape,
	next: TLTableShape
): TableStructureChange | null {
	const rows = axisMap(prev.props.rows, next.props.rows)
	const cols = axisMap(prev.props.cols, next.props.cols)
	if (isIdentity(rows, next.props.rows.length) && isIdentity(cols, next.props.cols.length)) {
		return null
	}
	return { rows, cols }
}
