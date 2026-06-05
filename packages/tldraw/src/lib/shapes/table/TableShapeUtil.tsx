import {
	Geometry2d,
	Group2d,
	Rectangle2d,
	SVGContainer,
	ShapeUtil,
	SvgExportContext,
	TLHandle,
	TLHandleDragInfo,
	TLResizeInfo,
	TLShape,
	TLShapePartial,
	TLTableCellShape,
	TLTableShape,
	TLTheme,
	Vec,
	getColorValue,
	getIndices,
	tableShapeMigrations,
	tableShapeProps,
	uniqueId,
	useValue,
} from '@tldraw/editor'
import { startEditingShapeWithRichText } from '../../tools/SelectTool/selectHelpers'
import {
	TABLE_CONSTANTS,
	type TableLayout,
	getCellAtPoint,
	getCellKey,
	getTableLayout,
	resolveCellStyle,
} from './core'
import { reflowRowHeights } from './reflow'
import {
	drillSelectCell,
	findOrCreateCell,
	getTableCells,
	isCellEmpty,
	navigateCell,
	reconcileTable,
	tabNavigateCell,
} from './tableOperations'

/**
 * Renders the table's grid chrome — cell backgrounds, interior borders, and the
 * outer frame — as plain SVG elements. Shared by the live `component` (wrapped in
 * an `SVGContainer`) and `toSvg` export (emitted directly), so the canvas and the
 * exported vector always match. Cell *content* is drawn by the child cell shapes.
 */
function TableGrid({
	shape,
	layout,
	cellsByKey,
	theme,
	colorMode,
}: {
	shape: TLTableShape
	layout: TableLayout
	cellsByKey: Map<string, TLTableCellShape>
	theme: TLTheme
	colorMode: 'light' | 'dark'
}) {
	const colors = theme.colors[colorMode]
	const borderColor = getColorValue(colors, shape.props.color, 'solid')
	const { BORDER_WIDTH } = TABLE_CONSTANTS
	const showBorders = shape.props.borders !== 'none'

	// Resolve every cell's background through the single style resolver, so empty
	// cells, populated cells, and headers all agree (and a styled header cell keeps
	// its own fill — the v1 header bug is impossible here).
	const backgroundFor = (rowIndex: number, colIndex: number, cell?: TLTableCellShape): string => {
		const style = resolveCellStyle(shape, rowIndex, colIndex, cell)
		if (style.fill === 'none') return 'transparent'
		const variant = style.fill === 'solid' || style.fill === 'fill' ? 'fill' : 'semi'
		return getColorValue(colors, style.color, variant)
	}

	return (
		<>
			{layout.rows.map((row) =>
				layout.cols.map((col) => {
					const cell = cellsByKey.get(getCellKey(row.id, col.id))
					const bg = backgroundFor(row.index, col.index, cell)
					if (bg === 'transparent') return null
					return (
						<rect
							key={`bg:${row.id}:${col.id}`}
							x={col.x}
							y={row.y}
							width={col.width}
							height={row.height}
							fill={bg}
						/>
					)
				})
			)}
			{showBorders &&
				layout.cols.map((col, i) =>
					i === 0 ? null : (
						<line
							key={`v:${col.id}`}
							x1={col.x}
							y1={0}
							x2={col.x}
							y2={layout.height}
							stroke={borderColor}
							strokeWidth={BORDER_WIDTH}
						/>
					)
				)}
			{showBorders &&
				layout.rows.map((row, i) =>
					i === 0 ? null : (
						<line
							key={`h:${row.id}`}
							x1={0}
							y1={row.y}
							x2={layout.width}
							y2={row.y}
							stroke={borderColor}
							strokeWidth={BORDER_WIDTH}
						/>
					)
				)}
			{showBorders && (
				<rect
					x={0}
					y={0}
					width={layout.width}
					height={layout.height}
					fill="none"
					stroke={borderColor}
					strokeWidth={BORDER_WIDTH}
				/>
			)}
		</>
	)
}

const ARROW_DIRS: Record<string, 'left' | 'right' | 'up' | 'down'> = {
	ArrowLeft: 'left',
	ArrowRight: 'right',
	ArrowUp: 'up',
	ArrowDown: 'down',
}

const COL_HANDLE_PREFIX = 'col-resize:'

/**
 * A table shape: a grid of cells holding editable rich text.
 *
 * The table is a frame-like container that owns the structural skeleton (ordered
 * columns and rows) and the default style for its cells. It renders the grid
 * (backgrounds + borders) as SVG; cell *content* is rendered by sparse `table-cell`
 * child shapes positioned over the grid. Column widths and row heights are stored,
 * so layout is computed purely (see `core/`) and is the same on every client.
 *
 * @public
 */
export class TableShapeUtil extends ShapeUtil<TLTableShape> {
	static override type = 'table' as const
	static override props = tableShapeProps
	static override migrations = tableShapeMigrations

	private reflowHandlerRegistered = false

	// Register (once per editor) side effects that keep cells positioned as the
	// skeleton changes, and drop empty cells that were only selected by clicking.
	// Registered lazily because `editor.sideEffects` isn't available when shape
	// utils are constructed.
	private ensureReflowHandler() {
		if (this.reflowHandlerRegistered || !this.editor.sideEffects) return
		this.reflowHandlerRegistered = true
		const { editor } = this

		// Re-measure only the cell's own row — a content edit can't change another
		// row's height, so we avoid re-measuring the whole table on every keystroke.
		const reflowParentOf = (cell: TLTableCellShape) => {
			const table = editor.getShape(cell.parentId)
			if (table?.type === 'table') {
				reflowRowHeights(editor, table as TLTableShape, new Set([cell.props.rowId]))
			}
		}

		// Skeleton changes reposition cells; cell content changes re-measure heights.
		editor.sideEffects.registerAfterChangeHandler('shape', (prev, next) => {
			if (next.type === 'table') {
				const p = prev as TLTableShape
				const n = next as TLTableShape
				if (p.props.cols !== n.props.cols) {
					// Column add/remove/resize changes wrapping in every row → re-measure
					// all rows, then reposition cells with the new widths and heights.
					reflowRowHeights(editor, n)
					reconcileTable(editor, editor.getShape(n.id) as TLTableShape)
				} else if (p.props.rows !== n.props.rows) {
					reconcileTable(editor, n)
				}
			} else if (next.type === 'table-cell') {
				const p = prev as TLTableCellShape
				const n = next as TLTableCellShape
				// Content (or per-cell font/size) changing the row's tallest cell.
				if (
					p.props.richText !== n.props.richText ||
					p.props.font !== n.props.font ||
					p.props.size !== n.props.size
				) {
					reflowParentOf(n)
				}
			}
		})
		// Creating/deleting a cell can change its row's height.
		editor.sideEffects.registerAfterCreateHandler('shape', (shape) => {
			if (shape.type === 'table-cell') reflowParentOf(shape as TLTableCellShape)
		})
		editor.sideEffects.registerAfterDeleteHandler('shape', (shape) => {
			if (shape.type === 'table-cell') reflowParentOf(shape as TLTableCellShape)
		})

		// When a cell is deselected without gaining content, drop it so clicking
		// around doesn't accrue empty records. Bound cells are preserved.
		editor.sideEffects.registerAfterChangeHandler('instance_page_state', (prev, next) => {
			if (prev.selectedShapeIds === next.selectedShapeIds) return
			for (const id of prev.selectedShapeIds) {
				if (next.selectedShapeIds.includes(id)) continue
				const cell = editor.getShape(id)
				if (
					cell &&
					cell.type === 'table-cell' &&
					editor.getEditingShapeId() !== id &&
					isCellEmpty(editor, cell as TLTableCellShape) &&
					editor.getBindingsInvolvingShape(id).length === 0
				) {
					editor.deleteShapes([id])
				}
			}
		})

		// Keyboard navigation between cells. Capture phase so it runs before the default
		// nudge / focus-move. Registered with cleanup so it's removed on dispose.
		const container = editor.getContainer()
		const onKeyDown = (e: KeyboardEvent) => {
			// Tab / Shift+Tab moves forward / back across cells, wrapping at row ends.
			// Unlike the arrows, it works *while editing* — it commits the current cell
			// and moves on, keeping you in edit mode, the spreadsheet idiom.
			if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey && !e.altKey) {
				const editingId = editor.getEditingShapeId()
				const selectedIds = editor.getSelectedShapeIds()
				const currentId = editingId ?? (selectedIds.length === 1 ? selectedIds[0] : null)
				const cell = currentId ? editor.getShape(currentId) : null
				if (!cell || cell.type !== 'table-cell') return
				e.preventDefault()
				e.stopPropagation()
				const next = tabNavigateCell(editor, cell as TLTableCellShape, e.shiftKey ? 'prev' : 'next')
				// If we were editing, keep editing the cell we landed on.
				if (next && editingId) startEditingShapeWithRichText(editor, next, { selectAll: true })
				return
			}

			// Arrow navigation only when not editing and no text field is focused, so the
			// caret can move within a cell being edited.
			if (editor.getEditingShapeId() || e.metaKey || e.ctrlKey || e.altKey) return
			const active = container.ownerDocument.activeElement
			if (
				active instanceof HTMLElement &&
				(active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
			) {
				return
			}
			const dir = ARROW_DIRS[e.key]
			if (!dir) return
			const ids = editor.getSelectedShapeIds()
			if (ids.length !== 1) return
			const cell = editor.getShape(ids[0])
			if (!cell || cell.type !== 'table-cell') return
			e.preventDefault()
			e.stopPropagation()
			navigateCell(editor, cell as TLTableCellShape, dir)
		}
		container.addEventListener('keydown', onKeyDown, { capture: true })
		editor.disposables.add(() =>
			container.removeEventListener('keydown', onKeyDown, { capture: true })
		)
	}

	override onBeforeCreate(shape: TLTableShape) {
		this.ensureReflowHandler()
		return shape
	}

	override getDefaultProps(): TLTableShape['props'] {
		return {
			cols: Array.from({ length: 3 }, () => ({
				id: uniqueId(),
				width: TABLE_CONSTANTS.DEFAULT_COL_WIDTH,
			})),
			rows: Array.from({ length: 3 }, () => ({ id: uniqueId() })),
			color: 'black',
			fill: 'none',
			font: 'draw',
			size: 'm',
			align: 'start',
			verticalAlign: 'middle',
			headerRows: 0,
			headerCols: 0,
			borders: 'all',
		}
	}

	// Frame-like container behavior (we don't extend BaseFrameLikeShapeUtil because
	// its box w/h model conflicts with our derived sizing). `isFrameLike` makes a
	// single click resolve to the table, not a cell.
	override isFrameLike() {
		return true
	}
	override providesBackgroundForChildren() {
		return true
	}
	override canReceiveNewChildrenOfType(_shape: TLTableShape, type: TLShape['type']) {
		return type === 'table-cell'
	}
	override canRemoveChildrenOfType() {
		return false
	}
	override getClipPath(shape: TLTableShape): Vec[] | undefined {
		return this.editor.getShapeGeometry(shape.id).vertices
	}

	override canResize() {
		return true
	}

	override onResize(shape: TLTableShape, info: TLResizeInfo<TLTableShape>) {
		// Only columns have a manual width; rows are auto-height (they fit content),
		// so vertical scaling is ignored — the row reconciler owns row heights.
		const cols = info.initialShape.props.cols.map((c) => ({
			...c,
			width: Math.max(TABLE_CONSTANTS.MIN_COL_WIDTH, c.width * info.scaleX),
		}))
		return { props: { ...shape.props, cols } }
	}

	// Editable so that double-clicking an empty cell (no cell record to hit) routes
	// here; `onEditStart` then creates the cell and redirects editing to it.
	override canEdit() {
		return true
	}

	override onClick(shape: TLTableShape): TLShapePartial<TLTableShape> | void {
		const { editor } = this
		if (editor.getIsReadonly()) return
		const point = editor.getPointInShapeSpace(shape, editor.inputs.getCurrentPagePoint())
		const hit = getCellAtPoint(getTableLayout(shape), point.x, point.y)
		if (!hit) return
		drillSelectCell(editor, shape, hit.rowId, hit.colId)
		return { id: shape.id, type: shape.type }
	}

	override onDoubleClick(shape: TLTableShape): TLShapePartial<TLTableShape> | void {
		const { editor } = this
		if (editor.getIsReadonly()) return
		const point = editor.getPointInShapeSpace(shape, editor.inputs.getCurrentPagePoint())
		const hit = getCellAtPoint(getTableLayout(shape), point.x, point.y)
		if (!hit) return
		editor.markHistoryStoppingPoint('editing table cell')
		const cellId = findOrCreateCell(editor, shape, hit.rowId, hit.colId)
		startEditingShapeWithRichText(editor, cellId, { selectAll: true })
		return { id: shape.id, type: shape.type }
	}

	override onEditStart(shape: TLTableShape) {
		const { editor } = this
		if (editor.getIsReadonly()) return
		const point = editor.getPointInShapeSpace(shape, editor.inputs.getCurrentPagePoint())
		const hit = getCellAtPoint(getTableLayout(shape), point.x, point.y)
		if (!hit) return
		const cellId = findOrCreateCell(editor, shape, hit.rowId, hit.colId)
		if (editor.getEditingShapeId() !== cellId) {
			editor.setEditingShape(cellId)
		}
	}

	// Interior column resize handles (the outer edges belong to the whole-table
	// resize via the selection's corner/edge handles). Rows are auto-height, so they
	// have no resize handle — they fit their content.
	override getHandles(shape: TLTableShape): TLHandle[] {
		const layout = getTableLayout(shape)
		const indices = getIndices(layout.cols.length)
		const handles: TLHandle[] = []
		layout.cols.forEach((col, i) => {
			if (i === layout.cols.length - 1) return
			handles.push({
				id: `${COL_HANDLE_PREFIX}${col.id}`,
				type: 'vertex',
				index: indices[i],
				x: col.x + col.width,
				y: layout.height / 2,
				canSnap: false,
			})
		})
		return handles
	}

	override onHandleDrag(
		shape: TLTableShape,
		{ handle }: TLHandleDragInfo<TLTableShape>
	): TLShapePartial<TLTableShape> | void {
		if (!handle.id.startsWith(COL_HANDLE_PREFIX)) return
		const layout = getTableLayout(shape)
		const colId = handle.id.slice(COL_HANDLE_PREFIX.length)
		const colIndex = shape.props.cols.findIndex((c) => c.id === colId)
		if (colIndex === -1) return
		const newWidth = Math.max(TABLE_CONSTANTS.MIN_COL_WIDTH, handle.x - layout.cols[colIndex].x)
		const cols = shape.props.cols.map((c, i) => (i === colIndex ? { ...c, width: newWidth } : c))
		return { id: shape.id, type: shape.type, props: { cols } }
	}

	override getGeometry(shape: TLTableShape): Geometry2d {
		this.ensureReflowHandler()
		const layout = getTableLayout(shape)
		// Frame-like shapes must return a Group2d — `getShapeAtPoint` iterates
		// `geometry.children` for them.
		return new Group2d({
			children: [new Rectangle2d({ width: layout.width, height: layout.height, isFilled: true })],
		})
	}

	override component(shape: TLTableShape) {
		const { editor } = this

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useValue('table-theme', () => editor.getCurrentTheme(), [editor])
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const colorMode = useValue('table-colormode', () => editor.getColorMode(), [editor])
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const layout = useValue('table-layout', () => getTableLayout(shape), [shape])
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const cellsByKey = useValue('table-cells', () => getTableCells(editor, shape.id), [
			editor,
			shape.id,
		])

		return (
			<SVGContainer>
				<TableGrid
					shape={shape}
					layout={layout}
					cellsByKey={cellsByKey}
					theme={theme}
					colorMode={colorMode}
				/>
			</SVGContainer>
		)
	}

	// Native SVG export of the grid chrome (backgrounds + borders). Cell content is
	// exported separately by each `table-cell` child shape, so this only draws the
	// table's own structure — as real vector rects/lines, not a rasterizable HTML
	// foreign object. Uses the export's color mode so dark/light exports are correct.
	override toSvg(shape: TLTableShape, ctx: SvgExportContext) {
		const layout = getTableLayout(shape)
		const cellsByKey = getTableCells(this.editor, shape.id)
		return (
			<TableGrid
				shape={shape}
				layout={layout}
				cellsByKey={cellsByKey}
				theme={this.editor.getCurrentTheme()}
				colorMode={ctx.colorMode}
			/>
		)
	}

	override getIndicatorPath(shape: TLTableShape) {
		const layout = getTableLayout(shape)
		const path = new Path2D()
		path.rect(0, 0, layout.width, layout.height)
		return path
	}
}
