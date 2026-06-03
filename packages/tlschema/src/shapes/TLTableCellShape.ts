import { T } from '@tldraw/validate'
import { TLRichText, richTextValidator } from '../misc/TLRichText'
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
 * Properties for a table cell shape. A cell is a sparse, lazily-created child of
 * a `table` shape, addressed by the stable `(rowId, colId)`. The default `kind`
 * is `'text'`, which renders `richText`. Custom kinds store their structured
 * data in the cell's `meta` (a uniform `JsonObject`) rather than a typed prop —
 * an `unknown`-typed prop would poison the `TLShapePartial` discriminated union.
 *
 * Every visual style is per-cell (`color`, `fill`, `font`, `size`, `align`,
 * `verticalAlign`): a cell inherits the parent table's defaults when created and
 * is editable from the style panel when selected. Empty (uncreated) cells fall
 * back to the table's defaults via the style resolver, so the table and the cells
 * always agree on how a cell looks.
 *
 * @public
 */
export interface TLTableCellShapeProps {
	/** Id of the row this cell belongs to (references the parent table's `rows`) */
	rowId: string
	/** Id of the column this cell belongs to (references the parent table's `cols`) */
	colId: string
	/** Cell kind; the registry key used to render and edit the cell. Defaults to `'text'`. */
	kind: string
	/** Rich text content (used by the default `'text'` kind) */
	richText: TLRichText
	/** Text color for this cell */
	color: TLDefaultColorStyle
	/** Background fill for this cell */
	fill: TLDefaultFillStyle
	/** Font family for this cell */
	font: TLDefaultFontStyle
	/** Size scale for this cell */
	size: TLDefaultSizeStyle
	/** Horizontal alignment of this cell's content */
	align: TLDefaultHorizontalAlignStyle
	/** Vertical alignment of this cell's content */
	verticalAlign: TLDefaultVerticalAlignStyle
}

/**
 * A table cell shape: the content record for a single cell of a `table`. Cells
 * are parented to the table, which owns their layout. They are drilled into for
 * selection and editing, and are individually bindable.
 *
 * @public
 */
export type TLTableCellShape = TLBaseShape<'table-cell', TLTableCellShapeProps>

/**
 * Validation schema for table cell shape properties.
 *
 * @public
 */
export const tableCellShapeProps: RecordProps<TLTableCellShape> = {
	rowId: T.string,
	colId: T.string,
	kind: T.string,
	richText: richTextValidator,
	color: DefaultColorStyle,
	fill: DefaultFillStyle,
	font: DefaultFontStyle,
	size: DefaultSizeStyle,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
}

/**
 * Migration sequence for table cell shape properties.
 *
 * @public
 */
export const tableCellShapeMigrations = createShapePropsMigrationSequence({
	sequence: [],
})
