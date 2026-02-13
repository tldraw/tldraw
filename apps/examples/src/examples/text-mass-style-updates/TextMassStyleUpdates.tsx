import { getSchema, JSONContent } from '@tiptap/core'
import { Fragment, Node, Schema } from '@tiptap/pm/model'
import {
	Editor,
	tipTapDefaultExtensions,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TLEditorComponents,
	TLShapeId,
	TLTextShape,
	track,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

const schema = getSchema(tipTapDefaultExtensions)

type Style = 'bold' | 'italic' | 'highlight'

/** Check whether every text node in the document carries the given mark. */
function isUniformlyMarked(doc: Node, markName: string): boolean {
	let hasText = false
	let allMarked = true
	doc.descendants((node) => {
		if (node.isText) {
			hasText = true
			if (!node.marks.some((m) => m.type.name === markName)) {
				allMarked = false
			}
		}
	})
	return hasText && allMarked
}

/** Return a new document with the mark added to or removed from every text node. */
function toggleMark(doc: Node, schema: Schema, markName: string): Node {
	const markType = schema.marks[markName]
	const shouldRemove = isUniformlyMarked(doc, markName)

	return mapTextNodes(doc, schema, (node) => {
		if (shouldRemove) {
			return node.mark(node.marks.filter((m) => m.type !== markType))
		} else {
			return node.mark(markType.create().addToSet(node.marks))
		}
	})
}

/** Map over all text nodes in a document, returning a new document. */
function mapTextNodes(node: Node, schema: Schema, fn: (textNode: Node) => Node): Node {
	if (node.isText) return fn(node)
	if (node.content.size === 0) return node
	const children: Node[] = []
	node.content.forEach((child) => {
		children.push(mapTextNodes(child, schema, fn))
	})
	return node.copy(Fragment.from(children))
}

function toggleMarkOnShape(editor: Editor, id: TLShapeId, style: Style) {
	const shape = editor.getShape(id)
	if (!shape) return
	if (shape.type === 'text') {
		const richText = (shape as TLTextShape).props.richText
		const doc = Node.fromJSON(schema, richText as JSONContent)
		const updated = toggleMark(doc, schema, style)
		editor.updateShape<TLTextShape>({
			id,
			type: 'text',
			props: { richText: updated.toJSON() },
		})
	} else {
		editor
			.getSortedChildIdsForParent(id)
			.forEach((childId) => toggleMarkOnShape(editor, childId, style))
	}
}

function toggleRichTextStyle(editor: Editor, style: Style) {
	editor.run(() => {
		editor.getSelectedShapeIds().forEach((id) => {
			toggleMarkOnShape(editor, id, style)
		})
	})
}

function isUniformlyStyled(editor: Editor, shapeId: TLTextShape['id'], style: Style) {
	const shape = editor.getShape(shapeId)
	if (!shape) return false
	if (shape.type === 'text') {
		const doc = Node.fromJSON(schema, (shape as TLTextShape).props.richText as JSONContent)
		return isUniformlyMarked(doc, style)
	}
	return false
}

const ContextToolbarComponent = track(() => {
	const editor = useEditor()
	const showToolbar = editor.isIn('select.idle')
	if (!showToolbar) return null
	const selectionRotatedPageBounds = editor.getSelectionRotatedPageBounds()
	if (!selectionRotatedPageBounds) return null

	const pageCoordinates = editor.pageToViewport(selectionRotatedPageBounds.point)

	const allSelectedShapes = editor.getShapeAndDescendantIds(editor.getSelectedShapeIds())
	const allSelectedTextShapes = [...allSelectedShapes].filter(
		(id) => editor.getShape(id)?.type === 'text'
	) as TLShapeId[]

	if (!allSelectedTextShapes.length) return null

	const areAllBold = allSelectedTextShapes.every((id) => isUniformlyStyled(editor, id, 'bold'))
	const areAllItalic = allSelectedTextShapes.every((id) => isUniformlyStyled(editor, id, 'italic'))
	const areAllHighlighted = allSelectedTextShapes.every((id) =>
		isUniformlyStyled(editor, id, 'highlight')
	)

	return (
		<div
			style={{
				position: 'absolute',
				pointerEvents: 'all',
				top: pageCoordinates.y - 42,
				left: pageCoordinates.x,
				// [3]
				width: selectionRotatedPageBounds.width * editor.getZoomLevel(),
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
			}}
			// [4]
			onPointerDown={(e) => e.stopPropagation()}
		>
			<div
				style={{
					borderRadius: 8,
					display: 'flex',
					boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.1)',
					background: 'var(--color-panel)',
					width: 'fit-content',
					alignItems: 'center',
				}}
			>
				<TldrawUiButton
					data-state={areAllItalic ? 'hinted' : undefined}
					type="normal"
					onClick={() => toggleRichTextStyle(editor, 'italic')}
				>
					<TldrawUiButtonIcon icon="italic" />
				</TldrawUiButton>
				<TldrawUiButton
					data-state={areAllBold ? 'hinted' : undefined}
					type="normal"
					onClick={() => toggleRichTextStyle(editor, 'bold')}
				>
					<TldrawUiButtonIcon icon="bold" />
				</TldrawUiButton>
				<TldrawUiButton
					data-state={areAllHighlighted ? 'hinted' : undefined}
					type="normal"
					onClick={() => toggleRichTextStyle(editor, 'highlight')}
				>
					<TldrawUiButtonIcon icon="highlight" />
				</TldrawUiButton>
			</div>
		</div>
	)
})

const components: TLEditorComponents = {
	InFrontOfTheCanvas: ContextToolbarComponent,
}

export default function ContextToolbar() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="mass-style-updates-example" components={components} />
		</div>
	)
}

/*
This is a naive example to show how you can create a toolbar that allows you to toggle rich text styles
on multiple text shapes at once, for the whole shape.
*/
