import {
	Editor,
	Geometry2d,
	HTMLContainer,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLBaseBoxShape,
	TLResizeInfo,
	TLShapePartial,
	TLTableShape,
	TLTableShapeProps,
	getColorValue,
	resizeBox,
	tableShapeMigrations,
	tableShapeProps,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { createTextJsxFromSpans } from '../shared/createTextJsxFromSpans'
import { LABEL_FONT_SIZES, TEXT_PROPS, getFontFamily } from '../shared/default-shape-constants'
import { getThemeFontFaces } from '../shared/defaultFonts'
import { ShapeOptionsWithDisplayValues, getDisplayValues } from '../shared/getDisplayValues'
import {
	TABLE_MIN_COLUMN_WIDTH,
	TABLE_MIN_ROW_HEIGHT,
	appendTableColumn,
	appendTableRow,
	createTableShapeProps,
	getSortedTableColumns,
	getSortedTableRows,
	getTableCellAtPoint,
	getTableCellText,
	getTableSize,
	insertTableColumn,
	insertTableRow,
	removeTableColumn,
	removeTableRow,
	setTableCellText,
	TableInsertSide,
} from './tableHelpers'

const CELL_PADDING = 8

/** @public */
export interface TableShapeUtilDisplayValues {
	strokeColor: string
	fillColor: string
	textColor: string
	fontFamily: string
	fontSize: number
	lineHeight: number
}

/** @public */
export type TableShapeOptions = ShapeOptionsWithDisplayValues<
	TLTableShape,
	TableShapeUtilDisplayValues
>

/** @public */
export class TableShapeUtil extends ShapeUtil<TLTableShape> {
	static override type = 'table' as const
	static override props = tableShapeProps
	static override migrations = tableShapeMigrations

	override options: TableShapeOptions = {
		getDefaultDisplayValues(_editor, shape, theme, colorMode): TableShapeUtilDisplayValues {
			const { color, font, size } = shape.props
			const colors = theme.colors[colorMode]
			return {
				strokeColor: getColorValue(colors, color, 'solid'),
				fillColor: colors.background,
				textColor: getColorValue(colors, color, 'solid'),
				fontFamily: getFontFamily(theme, font),
				fontSize: theme.fontSize * LABEL_FONT_SIZES[size],
				lineHeight: theme.lineHeight,
			}
		},
		getCustomDisplayValues(): Partial<TableShapeUtilDisplayValues> {
			return {}
		},
	}

	override canEdit() {
		return true
	}

	override getDefaultProps(): TLTableShape['props'] {
		return {
			color: 'black',
			font: 'sans',
			size: 's',
			...createTableShapeProps([
				['', '', ''],
				['', '', ''],
				['', '', ''],
			]),
		}
	}

	override getGeometry(shape: TLTableShape): Geometry2d {
		const { w, h } = getTableSize(shape.props)
		return new Rectangle2d({ width: Math.max(w, 1), height: Math.max(h, 1), isFilled: true })
	}

	override getFontFaces(shape: TLTableShape) {
		return getThemeFontFaces(this.editor.getCurrentTheme(), shape.props.font) ?? []
	}

	override getText(shape: TLTableShape) {
		const { props } = shape
		return getSortedTableRows(props)
			.map((row) =>
				getSortedTableColumns(props)
					.map((column) => getTableCellText(props, row.id, column.id))
					.join('\t')
			)
			.join('\n')
	}

	override onResize(shape: TLTableShape, info: TLResizeInfo<TLTableShape>) {
		const { initialShape } = info
		const initialSize = getTableSize(initialShape.props)
		const initialColumns = getSortedTableColumns(initialShape.props)
		const initialRows = getSortedTableRows(initialShape.props)

		// Reuse resizeBox for flipping and handle-aware clamping by treating the table as a box
		const asBox = (s: TLTableShape) =>
			({ ...s, props: getTableSize(s.props) }) as unknown as TLBaseBoxShape
		const resized = resizeBox(
			asBox(shape),
			{ ...info, initialShape: asBox(initialShape) },
			{
				minWidth: TABLE_MIN_COLUMN_WIDTH * initialColumns.length,
				minHeight: TABLE_MIN_ROW_HEIGHT * initialRows.length,
			}
		)

		const scaleX = resized.props.w / initialSize.w
		const scaleY = resized.props.h / initialSize.h

		const columns: TLTableShapeProps['columns'] = {}
		for (const { id, ...column } of initialColumns) {
			columns[id] = {
				...column,
				width: Math.max(TABLE_MIN_COLUMN_WIDTH, column.width * scaleX),
			}
		}
		const rows: TLTableShapeProps['rows'] = {}
		for (const { id, ...row } of initialRows) {
			rows[id] = { ...row, height: Math.max(TABLE_MIN_ROW_HEIGHT, row.height * scaleY) }
		}

		return {
			id: shape.id,
			type: shape.type,
			x: resized.x,
			y: resized.y,
			props: { columns, rows },
		} satisfies TLShapePartial<TLTableShape>
	}

	override component(shape: TLTableShape) {
		return <TableShapeComponent shape={shape} util={this} />
	}

	override getIndicatorPath(shape: TLTableShape) {
		const { w, h } = getTableSize(shape.props)
		const path = new Path2D()
		path.rect(0, 0, w, h)
		return path
	}

	override toSvg(shape: TLTableShape, ctx: SvgExportContext) {
		const { props } = shape
		const dv = getDisplayValues(this, shape, ctx.colorMode)
		const { w, h } = getTableSize(props)
		const columns = getSortedTableColumns(props)
		const rows = getSortedTableRows(props)

		const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
		const texts: {
			key: string
			x: number
			y: number
			width: number
			height: number
			text: string
		}[] = []

		let x = 0
		for (const column of columns.slice(0, -1)) {
			x += column.width
			lines.push({ x1: x, y1: 0, x2: x, y2: h })
		}

		let y = 0
		for (const row of rows) {
			let cellX = 0
			for (const column of columns) {
				const text = getTableCellText(props, row.id, column.id)
				if (text) {
					texts.push({
						key: `${row.id}:${column.id}`,
						x: cellX,
						y,
						width: column.width,
						height: row.height,
						text,
					})
				}
				cellX += column.width
			}
			y += row.height
			if (y < h) lines.push({ x1: 0, y1: y, x2: w, y2: y })
		}

		return (
			<g>
				<rect width={w} height={h} fill={dv.fillColor} stroke={dv.strokeColor} strokeWidth={1} />
				{lines.map((l, i) => (
					<line key={i} {...l} stroke={dv.strokeColor} strokeWidth={1} />
				))}
				{texts.map((cell) => {
					const opts = {
						fontSize: dv.fontSize,
						fontFamily: dv.fontFamily,
						fontStyle: TEXT_PROPS.fontStyle,
						fontWeight: TEXT_PROPS.fontWeight,
						lineHeight: dv.lineHeight,
						textAlign: 'start' as const,
						verticalTextAlign: 'middle' as const,
						width: cell.width,
						height: cell.height,
						padding: CELL_PADDING,
						overflow: 'truncate-ellipsis' as const,
						offsetX: 0,
						offsetY: 0,
						fill: dv.textColor,
					}
					const spans = this.editor.textMeasure.measureTextSpans(cell.text, opts)
					return (
						<g key={cell.key} transform={`translate(${cell.x}, ${cell.y})`}>
							{createTextJsxFromSpans(this.editor, spans, opts)}
						</g>
					)
				})}
			</g>
		)
	}
}

type TableAxis = 'row' | 'column'

// Screen-space sizes, divided by the zoom level so handles stay usable at any zoom
const HANDLE_GUTTER = 20
const HANDLE_THICKNESS = 6

function TableShapeComponent({ shape, util }: { shape: TLTableShape; util: TableShapeUtil }) {
	const editor = useEditor()
	const { id, props } = shape
	const isEditing = useValue('isEditing', () => editor.getEditingShapeId() === id, [editor, id])
	const zoom = useValue('zoom', () => editor.getZoomLevel(), [editor])
	const dv = getDisplayValues(util, shape)
	const rContainer = useRef<HTMLDivElement>(null)

	const [hovered, setHovered] = useState<{ rowId?: string; columnId?: string } | null>(null)
	const [focused, setFocused] = useState<{ rowId: string; columnId: string } | null>(null)
	const [menu, setMenu] = useState<{ axis: TableAxis; id: string } | null>(null)

	const columns = getSortedTableColumns(props)
	const rows = getSortedTableRows(props)
	const { w, h } = getTableSize(props)
	const gutter = HANDLE_GUTTER / zoom

	useEffect(() => {
		if (isEditing) return
		setHovered(null)
		setFocused(null)
		setMenu(null)
	}, [isEditing])

	// When editing starts, focus the cell that was double-clicked, or the first cell if editing was
	// started some other way (e.g. pressing Enter).
	useEffect(() => {
		if (!isEditing) return
		const current = editor.getShape<TLTableShape>(id)
		if (!current) return
		const point = editor.getPointInShapeSpace(current, editor.inputs.getCurrentPagePoint())
		const cell = getTableCellAtPoint(current.props, point)
		const selector = cell ? `[data-cell="${cell.rowId}:${cell.columnId}"]` : 'textarea[data-cell]'
		rContainer.current?.querySelector<HTMLTextAreaElement>(selector)?.focus()
	}, [editor, id, isEditing])

	const updateProps = useCallback(
		(getChange: (props: TLTableShapeProps) => Partial<TLTableShapeProps> | undefined) => {
			const current = editor.getShape<TLTableShape>(id)
			if (!current) return
			const change = getChange(current.props)
			if (!change) return
			editor.updateShape<TLTableShape>({ id, type: 'table', props: change })
		},
		[editor, id]
	)

	const changeStructure = useCallback(
		(getChange: (props: TLTableShapeProps) => Partial<TLTableShapeProps> | undefined) => {
			editor.markHistoryStoppingPoint('table structure')
			updateProps(getChange)
			setMenu(null)
		},
		[editor, updateProps]
	)

	// Hovering a row or column, or its handle in the gutter, shows that row's or column's handle.
	// The pointer position is read from the event because the editor's input state updates after
	// this handler runs.
	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			const current = editor.getShape<TLTableShape>(id)
			if (!current) return
			const point = editor.getPointInShapeSpace(
				current,
				editor.screenToPage({ x: e.clientX, y: e.clientY })
			)
			const size = getTableSize(current.props)
			const inRows = point.y >= 0 && point.y < size.h && point.x >= -gutter
			const inColumns = point.x >= 0 && point.x < size.w && point.y >= -gutter
			const rowId = inRows
				? getTableCellAtPoint(current.props, { x: 0, y: point.y })?.rowId
				: undefined
			const columnId = inColumns
				? getTableCellAtPoint(current.props, { x: point.x, y: 0 })?.columnId
				: undefined
			setHovered((prev) =>
				prev?.rowId === rowId && prev?.columnId === columnId ? prev : { rowId, columnId }
			)
		},
		[editor, id, gutter]
	)

	const activeRowId = menu?.axis === 'row' ? menu.id : (hovered?.rowId ?? focused?.rowId)
	const activeColumnId =
		menu?.axis === 'column' ? menu.id : (hovered?.columnId ?? focused?.columnId)

	const rowOffsets = getOffsets(rows, (r) => r.height)
	const columnOffsets = getOffsets(columns, (c) => c.width)

	return (
		<HTMLContainer
			id={id}
			className="tl-table"
			onPointerDown={
				isEditing
					? (e) => {
							editor.markEventAsHandled(e)
							setMenu(null)
						}
					: undefined
			}
			onPointerMove={isEditing ? handlePointerMove : undefined}
			onPointerLeave={isEditing ? () => setHovered(null) : undefined}
			style={{
				pointerEvents: isEditing ? 'all' : 'none',
				width: w,
				height: h,
				gridTemplateColumns: columns.map((c) => `${c.width}px`).join(' '),
				gridTemplateRows: rows.map((r) => `${r.height}px`).join(' '),
				color: dv.textColor,
				backgroundColor: dv.fillColor,
				borderColor: dv.strokeColor,
				fontFamily: dv.fontFamily,
				fontSize: dv.fontSize,
				lineHeight: dv.lineHeight,
			}}
		>
			<div ref={rContainer} style={{ display: 'contents' }}>
				{rows.map((row) => (
					<Fragment key={row.id}>
						{columns.map((column) => {
							const text = getTableCellText(props, row.id, column.id)
							return (
								<div
									key={column.id}
									className="tl-table__cell"
									style={{ borderColor: dv.strokeColor, padding: CELL_PADDING }}
								>
									{isEditing ? (
										<textarea
											data-cell={`${row.id}:${column.id}`}
											className="tl-table__input"
											value={text}
											onFocus={() => setFocused({ rowId: row.id, columnId: column.id })}
											onChange={(e) =>
												updateProps((p) => setTableCellText(p, row.id, column.id, e.target.value))
											}
										/>
									) : (
										<div className="tl-table__text">{text}</div>
									)}
								</div>
							)
						})}
					</Fragment>
				))}
			</div>
			{isEditing && (
				<>
					{rows.map((row, i) =>
						row.id === activeRowId ? (
							<button
								key={row.id}
								className="tl-table__handle tl-table__handle-row"
								title="Row options"
								data-active={menu?.id === row.id || undefined}
								style={
									{
										left: -gutter,
										top: rowOffsets[i],
										width: gutter,
										height: row.height,
										'--tl-table-handle-thickness': `${HANDLE_THICKNESS / zoom}px`,
									} as React.CSSProperties
								}
								onPointerDown={stopPointerDown(editor)}
								onClick={() => setMenu(menu?.id === row.id ? null : { axis: 'row', id: row.id })}
							/>
						) : null
					)}
					{columns.map((column, i) =>
						column.id === activeColumnId ? (
							<button
								key={column.id}
								className="tl-table__handle tl-table__handle-column"
								title="Column options"
								data-active={menu?.id === column.id || undefined}
								style={
									{
										top: -gutter,
										left: columnOffsets[i],
										height: gutter,
										width: column.width,
										'--tl-table-handle-thickness': `${HANDLE_THICKNESS / zoom}px`,
									} as React.CSSProperties
								}
								onPointerDown={stopPointerDown(editor)}
								onClick={() =>
									setMenu(menu?.id === column.id ? null : { axis: 'column', id: column.id })
								}
							/>
						) : null
					)}
					{menu && (
						<TableHandleMenu
							axis={menu.axis}
							canRemove={(menu.axis === 'row' ? rows : columns).length > 1}
							style={
								menu.axis === 'row'
									? {
											right: `calc(100% + ${gutter}px)`,
											top: rowOffsets[rows.findIndex((r) => r.id === menu.id)],
											transform: `scale(${1 / zoom})`,
											transformOrigin: 'top right',
										}
									: {
											bottom: `calc(100% + ${gutter}px)`,
											left: columnOffsets[columns.findIndex((c) => c.id === menu.id)],
											transform: `scale(${1 / zoom})`,
											transformOrigin: 'bottom left',
										}
							}
							onPointerDown={stopPointerDown(editor)}
							onInsert={(side) =>
								changeStructure((p) =>
									menu.axis === 'row'
										? insertTableRow(p, menu.id, side)
										: insertTableColumn(p, menu.id, side)
								)
							}
							onRemove={() =>
								changeStructure((p) =>
									menu.axis === 'row' ? removeTableRow(p, menu.id) : removeTableColumn(p, menu.id)
								)
							}
						/>
					)}
					<button
						className="tl-table__add tl-table__add-column"
						title="Add column"
						onClick={() => changeStructure(appendTableColumn)}
					>
						+
					</button>
					<button
						className="tl-table__add tl-table__add-row"
						title="Add row"
						onClick={() => changeStructure(appendTableRow)}
					>
						+
					</button>
				</>
			)}
		</HTMLContainer>
	)
}

function TableHandleMenu({
	axis,
	canRemove,
	style,
	onPointerDown,
	onInsert,
	onRemove,
}: {
	axis: TableAxis
	canRemove: boolean
	style: React.CSSProperties
	onPointerDown(e: React.PointerEvent): void
	onInsert(side: TableInsertSide): void
	onRemove(): void
}) {
	const isRow = axis === 'row'
	return (
		<div className="tl-table__menu" style={style} onPointerDown={onPointerDown}>
			<button onClick={() => onInsert('before')}>{isRow ? 'Insert above' : 'Insert left'}</button>
			<button onClick={() => onInsert('after')}>{isRow ? 'Insert below' : 'Insert right'}</button>
			<button disabled={!canRemove} onClick={onRemove}>
				{isRow ? 'Delete row' : 'Delete column'}
			</button>
		</div>
	)
}

// Keeps a press on a handle or menu from reaching the cells, which would close the menu
function stopPointerDown(editor: Editor) {
	return (e: React.PointerEvent) => {
		editor.markEventAsHandled(e)
		e.stopPropagation()
	}
}

function getOffsets<T>(items: T[], getSize: (item: T) => number) {
	const offsets: number[] = []
	let offset = 0
	for (const item of items) {
		offsets.push(offset)
		offset += getSize(item)
	}
	return offsets
}
