import {
	Geometry2d,
	Rectangle2d,
	ShapeUtil,
	TLTableCellShape,
	TLTableShape,
	tableCellShapeMigrations,
	tableCellShapeProps,
	toRichText,
	useValue,
} from '@tldraw/editor'
import { TLTableCellKind, textCellKind } from './cellKinds'
import { TABLE_CONSTANTS, getTableLayout } from './core'
import { drillSelectCell } from './tableOperations'

/**
 * Options for {@link TableCellShapeUtil}. Register custom cell kinds via
 * `TableCellShapeUtil.configure({ kinds: [textCellKind, myKind] })`.
 *
 * @public
 */
export interface TableCellShapeOptions {
	kinds: TLTableCellKind[]
}

/**
 * The util for a single table cell. Cells are sparse child records of a `table`,
 * positioned over its grid. A cell renders its own content (via its registered
 * {@link TLTableCellKind}), so it is hittable and editable like a frame child. It
 * is drilled into for selection; the table owns its position and size. Cells exist
 * so each is its own multiplayer record, can be the editing shape, and is bindable.
 *
 * @public
 */
export class TableCellShapeUtil extends ShapeUtil<TLTableCellShape> {
	static override type = 'table-cell' as const
	static override props = tableCellShapeProps
	static override migrations = tableCellShapeMigrations

	override options: TableCellShapeOptions = { kinds: [textCellKind] }

	/** Resolve the cell kind for a `kind` prop, falling back to the text kind. */
	private getKind(type: string): TLTableCellKind {
		return (
			this.options.kinds.find((k) => k.type === type) ??
			this.options.kinds.find((k) => k.type === 'text') ??
			textCellKind
		)
	}

	override getDefaultProps(): TLTableCellShape['props'] {
		return {
			rowId: '',
			colId: '',
			kind: 'text',
			richText: toRichText(''),
			color: 'black',
			fill: 'none',
			font: 'draw',
			size: 'm',
			align: 'start',
			verticalAlign: 'middle',
		}
	}

	override canEdit() {
		return true
	}
	override canResize() {
		return false
	}
	override hideResizeHandles() {
		return true
	}
	override hideRotateHandle() {
		return true
	}
	// Pin the cell: any attempt to move it snaps back to its grid position.
	override onTranslate(initial: TLTableCellShape) {
		return { id: initial.id, type: initial.type, x: initial.x, y: initial.y }
	}

	// Clicking a cell drills: first click selects the table, the next selects the cell.
	override onClick(shape: TLTableCellShape) {
		const { editor } = this
		if (editor.getIsReadonly()) return
		const table = editor.getShape(shape.parentId)
		if (!table || table.type !== 'table') return
		drillSelectCell(editor, table as TLTableShape, shape.props.rowId, shape.props.colId)
		return { id: shape.id, type: shape.type }
	}

	private getCellSize(shape: TLTableCellShape): { w: number; h: number } {
		const parent = this.editor.getShape(shape.parentId) as TLTableShape | undefined
		if (parent?.type === 'table') {
			const layout = getTableLayout(parent)
			const col = layout.cols.find((c) => c.id === shape.props.colId)
			const row = layout.rows.find((r) => r.id === shape.props.rowId)
			if (col && row) return { w: col.width, h: row.height }
		}
		return { w: TABLE_CONSTANTS.DEFAULT_COL_WIDTH, h: TABLE_CONSTANTS.DEFAULT_ROW_HEIGHT }
	}

	override getGeometry(shape: TLTableCellShape): Geometry2d {
		const { w, h } = this.getCellSize(shape)
		return new Rectangle2d({ width: w, height: h, isFilled: true })
	}

	override component(shape: TLTableCellShape) {
		const { editor } = this
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const table = useValue(
			'cell-parent',
			() => editor.getShape(shape.parentId) as TLTableShape | undefined,
			[editor, shape.parentId]
		)
		if (!table || table.type !== 'table') return null

		const { w, h } = this.getCellSize(shape)
		const KindComponent = this.getKind(shape.props.kind).Component
		return <KindComponent editor={editor} shape={shape} table={table} width={w} height={h} />
	}

	override getIndicatorPath(shape: TLTableCellShape) {
		const { w, h } = this.getCellSize(shape)
		const path = new Path2D()
		path.rect(0, 0, w, h)
		return path
	}
}
