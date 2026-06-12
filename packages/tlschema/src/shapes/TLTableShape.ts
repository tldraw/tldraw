import { T } from '@tldraw/validate'
import { createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultFillStyle, TLDefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultFontStyle, TLDefaultFontStyle } from '../styles/TLFontStyle'
import {
	DefaultHorizontalAlignStyle,
	TLDefaultHorizontalAlignStyle,
} from '../styles/TLHorizontalAlignStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import {
	DefaultVerticalAlignStyle,
	TLDefaultVerticalAlignStyle,
} from '../styles/TLVerticalAlignStyle'
import { TLBaseShape } from './TLBaseShape'

/**
 * A column in a table shape. The `id` is a stable identifier that survives
 * inserts, deletes and reordering; `width` is the user-set column width in pixels.
 *
 * @public
 */
export interface TLTableShapeColumn {
	id: string
	width: number
}

/**
 * A row in a table shape. The `id` is a stable identifier. `height` is the row's
 * content-measured auto-height, recomputed from its cells and stored so every
 * client reads the same value. `manualHeight`, when set, is a user-dragged floor:
 * the row is at least this tall but still grows past it to fit taller content. The
 * rendered height is `max(height, manualHeight)`.
 *
 * @public
 */
export interface TLTableShapeRow {
	id: string
	height?: number
	manualHeight?: number
}

/**
 * Properties for the table shape. The table owns the structural skeleton (the
 * ordered columns and rows) and the **default style** applied to new and empty
 * cells. Cell content lives in separate `table-cell` child shapes keyed by
 * `(rowId, colId)`, each of which can override the style per cell.
 *
 * @public
 */
export interface TLTableShapeProps {
	/** Ordered columns. Column order is logical (LTR); RTL locales mirror at render time. */
	cols: TLTableShapeColumn[]
	/** Ordered rows. */
	rows: TLTableShapeRow[]
	/** Default text/border color, and the fallback color for empty cells */
	color: TLDefaultColorStyle
	/** Default cell fill, and the fallback fill for empty cells */
	fill: TLDefaultFillStyle
	/** Default font family for cells */
	font: TLDefaultFontStyle
	/** Default size scale for cells */
	size: TLDefaultSizeStyle
	/** Default horizontal alignment for cell content */
	align: TLDefaultHorizontalAlignStyle
	/** Default vertical alignment for cell content */
	verticalAlign: TLDefaultVerticalAlignStyle
	/**
	 * Number of leading rows that are headers (`0` = none). Header-ness is
	 * semantic: the style resolver applies a default header style that per-row and
	 * per-cell styles override, and the count is available for accessibility,
	 * export and freeze-header behavior.
	 */
	headerRows: number
	/** Number of leading columns that are headers (`0` = none). */
	headerCols: number
	/**
	 * Which borders to draw: `'all'` (full grid) or `'none'`. A plain prop (not a
	 * style) so apps choose whether to surface a control for it.
	 */
	borders: TLTableBorders
}

/**
 * The border display modes for a table shape.
 *
 * @public
 */
export type TLTableBorders = 'all' | 'none'

/**
 * A table shape: a grid of cells holding editable rich text. The table is a
 * frame-like container that owns its cell children's layout.
 *
 * @public
 */
export type TLTableShape = TLBaseShape<'table', TLTableShapeProps>

/**
 * Validation schema for table shape properties.
 *
 * @public
 */
export const tableShapeProps: RecordProps<TLTableShape> = {
	cols: T.arrayOf(T.object({ id: T.string, width: T.positiveNumber })),
	rows: T.arrayOf(
		T.object({
			id: T.string,
			height: T.positiveNumber.optional(),
			manualHeight: T.positiveNumber.optional(),
		})
	),
	color: DefaultColorStyle,
	fill: DefaultFillStyle,
	font: DefaultFontStyle,
	size: DefaultSizeStyle,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	headerRows: T.positiveInteger,
	headerCols: T.positiveInteger,
	borders: T.literalEnum('all', 'none'),
}

/**
 * Migration sequence for table shape properties.
 *
 * @public
 */
export const tableShapeMigrations = createShapePropsMigrationSequence({
	sequence: [],
})
