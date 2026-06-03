import {
	TLDefaultColorStyle,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultSizeStyle,
	TLDefaultVerticalAlignStyle,
	TLTableCellShape,
	TLTableShape,
} from '@tldraw/editor'

/**
 * The fully resolved visual style of a table cell.
 *
 * @public
 */
export interface ResolvedCellStyle {
	color: TLDefaultColorStyle
	fill: TLDefaultFillStyle
	font: TLDefaultFontStyle
	size: TLDefaultSizeStyle
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
}

/**
 * Resolve the style for a cell position. The single source of truth used both to
 * render empty (uncreated) cells and to initialise new cells, so the table chrome
 * and the cell content always agree.
 *
 * - A populated cell uses its own per-cell style (so a styled header cell keeps its
 *   look — the v1 bug where header cells ignored their own fill cannot happen here).
 * - An empty cell falls back to the table's defaults, with the built-in header
 *   shading layered in for header rows/columns. New cells created in a header are
 *   born with this resolved style, so they stay header-styled and overridable.
 *
 * @public
 */
export function resolveCellStyle(
	table: TLTableShape,
	rowIndex: number,
	colIndex: number,
	cell?: TLTableCellShape
): ResolvedCellStyle {
	if (cell) {
		const p = cell.props
		return {
			color: p.color,
			fill: p.fill,
			font: p.font,
			size: p.size,
			align: p.align,
			verticalAlign: p.verticalAlign,
		}
	}

	const p = table.props
	const isHeader = rowIndex < p.headerRows || colIndex < p.headerCols
	return {
		color: p.color,
		// header cells default to a subtle shaded background
		fill: isHeader && p.fill === 'none' ? 'semi' : p.fill,
		font: p.font,
		size: p.size,
		align: p.align,
		verticalAlign: p.verticalAlign,
	}
}
