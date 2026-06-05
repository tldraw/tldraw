import { TLTableCellShape, TLTableShape } from '@tldraw/editor'
import { getCellKey, getTableLayout } from './layout'

/** The minimal cell shape this module needs: anchor position and spans, in `props`. */
type SpannedCell = Pick<TLTableCellShape, 'props'>

/**
 * The resolved geometry of a merged (spanning) cell, in the table's local space.
 *
 * @public
 */
export interface MergedCellInfo {
	/** Anchor position (top-left). */
	rowId: string
	colId: string
	/** Span counts, clamped so the cell stays within the grid (always `>= 1`). */
	rowSpan: number
	colSpan: number
	x: number
	y: number
	width: number
	height: number
}

/**
 * The merge layout of a table: which cells span more than one row/column, and
 * which grid positions are *covered* by those spans (so they render nothing and
 * hit-test to the anchor). Spans are clamped to the grid. Pure.
 *
 * @public
 */
export interface TableMergeMap {
	/** Anchor cell key (`rowId:colId`) → its resolved merged rect. */
	anchors: Map<string, MergedCellInfo>
	/** Covered position key (`rowId:colId`) → the anchor key covering it. */
	covered: Map<string, string>
}

/**
 * Resolve a table's merged cells into anchor rects and a covered-position map.
 * A cell with `rowSpan`/`colSpan > 1` is an anchor covering the positions to its
 * right/below; those covered positions get no chrome and resolve to the anchor.
 * Spans are clamped to the grid edge, and a position already covered by an earlier
 * anchor can't itself start a span (overlaps are ignored). Pure.
 *
 * @public
 */
export function getMergeMap(table: TLTableShape, cells: Iterable<SpannedCell>): TableMergeMap {
	const layout = getTableLayout(table)
	const rowIndex = new Map<string, number>(layout.rows.map((r, i) => [r.id, i]))
	const colIndex = new Map<string, number>(layout.cols.map((c, i) => [c.id, i]))

	const anchors = new Map<string, MergedCellInfo>()
	const covered = new Map<string, string>()

	for (const { props } of cells) {
		const colSpan = Math.max(1, Math.floor(props.colSpan ?? 1))
		const rowSpan = Math.max(1, Math.floor(props.rowSpan ?? 1))
		if (colSpan === 1 && rowSpan === 1) continue

		const ri = rowIndex.get(props.rowId)
		if (ri === undefined) continue
		const ci = colIndex.get(props.colId)
		if (ci === undefined) continue

		const anchorKey = getCellKey(props.rowId, props.colId)
		// An anchor that is itself already covered by another merge is skipped.
		if (covered.has(anchorKey)) continue

		// Clamp the span to the grid so it can never point off the edge.
		const rEnd = Math.min(layout.rows.length - 1, ri + rowSpan - 1)
		const cEnd = Math.min(layout.cols.length - 1, ci + colSpan - 1)
		const clampedRowSpan = rEnd - ri + 1
		const clampedColSpan = cEnd - ci + 1
		if (clampedRowSpan === 1 && clampedColSpan === 1) continue

		const x = layout.cols[ci].x
		const y = layout.rows[ri].y
		const width = layout.cols[cEnd].x + layout.cols[cEnd].width - x
		const height = layout.rows[rEnd].y + layout.rows[rEnd].height - y

		anchors.set(anchorKey, {
			rowId: props.rowId,
			colId: props.colId,
			rowSpan: clampedRowSpan,
			colSpan: clampedColSpan,
			x,
			y,
			width,
			height,
		})

		for (let r: number = ri; r <= rEnd; r++) {
			for (let c: number = ci; c <= cEnd; c++) {
				if (r === ri && c === ci) continue
				covered.set(getCellKey(layout.rows[r].id, layout.cols[c].id), anchorKey)
			}
		}
	}

	return { anchors, covered }
}
