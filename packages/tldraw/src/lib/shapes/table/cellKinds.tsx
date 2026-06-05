/* eslint-disable react-hooks/rules-of-hooks */
import {
	Editor,
	HTMLContainer,
	TLTableCellShape,
	TLTableShape,
	getColorValue,
	useValue,
} from '@tldraw/editor'
import { type ReactNode } from 'react'
import {
	isEmptyRichText,
	renderHtmlFromRichTextForMeasurement,
	renderPlaintextFromRichText,
} from '../../utils/text/richText'
import { LABEL_FONT_SIZES, TEXT_PROPS, getFontFamily } from '../shared/default-shape-constants'
import { RichTextLabel } from '../shared/RichTextLabel'
import { TABLE_CONSTANTS, getCellAtPoint, getTableLayout, isCellStyleDefault } from './core'

const { CELL_PADDING } = TABLE_CONSTANTS

/**
 * Props passed to a cell kind's `Component`. Runs inside tldraw's reactive
 * rendering context, so it may read other shapes (e.g. sibling cells for a
 * formula) and re-render when they change.
 *
 * @public
 */
export interface TLTableCellKindProps {
	editor: Editor
	shape: TLTableCellShape
	table: TLTableShape
	/** Width of the cell rect, in px. */
	width: number
	/** Height of the cell rect, in px. */
	height: number
}

/**
 * A registered table cell kind. The `type` matches a cell's `kind` prop; the
 * `Component` renders it. Register custom kinds via
 * `TableCellShapeUtil.configure({ kinds: [...] })` to build number, checkbox,
 * formula, … cells without forking the table.
 *
 * @public
 */
export interface TLTableCellKind {
	/** Registry key, matching a cell's `kind` prop (e.g. `'text'`). */
	type: string
	/** Renders the cell's content. */
	Component(props: TLTableCellKindProps): ReactNode
	/**
	 * The minimum height this cell needs at `width`, for auto-height. Defaults to
	 * the base row height. A text cell measures its wrapped content; a fixed-size
	 * custom cell can return a constant.
	 */
	measure?(editor: Editor, cell: TLTableCellShape, width: number): number
	/** Plain-text projection of the cell (CSV/export). Defaults to its rich text. */
	getText?(editor: Editor, cell: TLTableCellShape): string
	/** Whether the cell is empty (collectable). Defaults to empty rich text. */
	isEmpty?(editor: Editor, cell: TLTableCellShape): boolean
}

/**
 * The built-in rich-text cell kind — the default for new cells. Renders editable
 * rich text and measures its content for auto-height.
 *
 * @public
 */
export const textCellKind: TLTableCellKind = {
	type: 'text',
	Component: TextCell,
	getText: (editor, cell) => renderPlaintextFromRichText(editor, cell.props.richText),
	// Empty = no text and no styling of its own. A cell whose style differs from the
	// resolved default for its position carries deliberate styling (e.g. a row you
	// selected and made bold/red, or gave a fill) and is kept; an unstyled blank cell
	// (clicked around, or materialised for a row selection and left as-is) is collectable.
	isEmpty: (editor, cell) => {
		if (!isEmptyRichText(cell.props.richText)) return false
		const table = editor.getShape(cell.parentId)
		if (table?.type !== 'table') return true
		const t = table as TLTableShape
		const rowIndex = t.props.rows.findIndex((r) => r.id === cell.props.rowId)
		const colIndex = t.props.cols.findIndex((c) => c.id === cell.props.colId)
		return isCellStyleDefault(t, rowIndex, colIndex, cell)
	},
	measure: (editor, cell, width) => {
		if (isEmptyRichText(cell.props.richText)) return TABLE_CONSTANTS.DEFAULT_ROW_HEIGHT
		const theme = editor.getCurrentTheme()
		const html = renderHtmlFromRichTextForMeasurement(editor, cell.props.richText)
		const size = editor.textMeasure.measureHtml(html, {
			...TEXT_PROPS,
			fontFamily: getFontFamily(theme, cell.props.font),
			fontSize: theme.fontSize * (LABEL_FONT_SIZES[cell.props.size] ?? 1.375),
			lineHeight: theme.lineHeight,
			maxWidth: Math.max(0, width - CELL_PADDING * 2),
		})
		return Math.max(TABLE_CONSTANTS.DEFAULT_ROW_HEIGHT, Math.ceil(size.h) + CELL_PADDING * 2)
	},
}

function TextCell({ editor, shape, table, width, height }: TLTableCellKindProps) {
	const theme = useValue('cell-theme', () => editor.getCurrentTheme(), [editor])
	const colorMode = useValue('cell-colormode', () => editor.getColorMode(), [editor])

	// Pre-mount the text editor when this cell is the editing shape OR hovered, so
	// the 'select-all-text' event on double-click-to-edit is caught in time.
	const shouldMountEditor = useValue(
		'cell-ready-for-editing',
		() => {
			if (editor.getEditingShapeId() === shape.id) return true
			const hoveredId = editor.getHoveredShapeId()
			if (hoveredId === shape.id) return true
			if (hoveredId === shape.parentId) {
				const local = editor.getPointInShapeSpace(table, editor.inputs.getCurrentPagePoint())
				const hit = getCellAtPoint(getTableLayout(table), local.x, local.y)
				return !!hit && hit.rowId === shape.props.rowId && hit.colId === shape.props.colId
			}
			return false
		},
		[editor, shape.id, shape.parentId, shape.props.rowId, shape.props.colId]
	)

	const colors = theme.colors[colorMode]
	// All style is per-cell now (color/fill/font/size/align), so read from the cell.
	const textColor = getColorValue(colors, shape.props.color, 'solid')
	const fontFamily = getFontFamily(theme, shape.props.font)
	const fontSize = theme.fontSize * (LABEL_FONT_SIZES[shape.props.size] ?? 1.375)
	const lineHeight = theme.lineHeight
	const textAlign: 'start' | 'center' | 'end' =
		shape.props.align === 'middle' ? 'center' : shape.props.align === 'end' ? 'end' : 'start'
	const verticalAlign: 'start' | 'middle' | 'end' =
		shape.props.verticalAlign === 'start'
			? 'start'
			: shape.props.verticalAlign === 'end'
				? 'end'
				: 'middle'

	return (
		<HTMLContainer style={{ width, height, overflow: 'hidden' }}>
			<RichTextLabel
				shapeId={shape.id}
				type="table-cell"
				richText={shape.props.richText}
				fontFamily={fontFamily}
				fontSize={fontSize}
				lineHeight={lineHeight}
				textAlign={textAlign}
				verticalAlign={verticalAlign}
				labelColor={textColor}
				isSelected={shouldMountEditor}
				padding={CELL_PADDING}
				wrap
			/>
		</HTMLContainer>
	)
}
