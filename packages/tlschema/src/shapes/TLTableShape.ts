import { IndexKey } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultFontStyle, TLDefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'

/**
 * A column in a table shape. Columns are keyed by id in {@link TLTableShapeProps.columns} and
 * ordered by their fractional `index`.
 *
 * @public
 */
export interface TLTableColumn {
	index: IndexKey
	width: number
}

/**
 * A row in a table shape. Rows are keyed by id in {@link TLTableShapeProps.rows} and ordered by
 * their fractional `index`.
 *
 * @public
 */
export interface TLTableRow {
	index: IndexKey
	height: number
}

/**
 * The content of a single table cell.
 *
 * @public
 */
export interface TLTableCell {
	text: string
}

/**
 * Properties for the table shape.
 *
 * Rows and columns are stored as maps keyed by a stable id rather than as arrays, and ordered by
 * fractional indexes. Inserting, removing or reordering a row then changes a single entry instead
 * of shifting every item after it. The shape's size is the sum of its column widths and row
 * heights, so it isn't stored separately.
 *
 * @public
 */
export interface TLTableShapeProps {
	color: TLDefaultColorStyle
	font: TLDefaultFontStyle
	size: TLDefaultSizeStyle
	columns: Record<string, TLTableColumn>
	rows: Record<string, TLTableRow>
	/**
	 * Cell content, keyed by row id and then by column id. Cells are sparse: an empty cell has no
	 * entry.
	 */
	cells: Record<string, Record<string, TLTableCell>>
}

/**
 * A table shape: a grid of plain-text cells.
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
	color: DefaultColorStyle,
	font: DefaultFontStyle,
	size: DefaultSizeStyle,
	columns: T.dict(T.string, T.object({ index: T.indexKey, width: T.nonZeroNumber })),
	rows: T.dict(T.string, T.object({ index: T.indexKey, height: T.nonZeroNumber })),
	cells: T.dict(T.string, T.dict(T.string, T.object({ text: T.string }))),
}

/**
 * Migration sequence for table shape properties.
 *
 * @public
 */
export const tableShapeMigrations = createShapePropsMigrationSequence({ sequence: [] })
