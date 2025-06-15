import {
	Editor,
	structuredClone,
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

interface RTMark {
	type: string
}
interface RTNode {
	content?: RTNode[]
	type: string
	marks?: RTMark[]
}
function hasMark(node: RTNode, type: string): boolean {
	if (node.type === 'paragraph' || node.type === 'text' || node.marks) {
		if (node.marks) {
			return node.marks.some((mark) => mark.type === type)
		}
	}
	if (node.content) {
		return node.content.some((child) => hasMark(child, type))
	}

	return false
}

function isUniformlyMarked(node: RTNode, type: string): boolean {
	const topLevelTextNodes: RTNode[] = []
	function collectTextNodes(node: RTNode) {
		if (node.type === 'text' || node.type === 'paragraph') {
			if (node.marks?.some((mark) => mark.type === type)) {
				topLevelTextNodes.push(node)
				return
			}
		}
		if (node.content) {
			node.content.forEach((child) => collectTextNodes(child))
		}
	}
	collectTextNodes(node)

	return (
		topLevelTextNodes.length > 0 &&
		topLevelTextNodes.every((node) => node.marks?.some((mark) => mark.type === type))
	)
}

function clearMark(node: RTNode, type: string) {
	if (node.type === 'paragraph' || node.type === 'text') {
		if (node.marks) {
			node.marks = node.marks.filter((mark) => mark.type !== type)
		}
	}
	if (node.content) {
		node.content.forEach((child) => clearMark(child, type))
	}
}

function addMark(node: RTNode, type: string) {
	if (node.type === 'text') {
		if (!node.marks) {
			node.marks = []
		}
		node.marks.push({ type })
		// no need to process children
		return
	}
	if (node.content) {
		node.content.forEach((child) => addMark(child, type))
	}
}

function toggleMark(node: RTNode, type: string) {
	if (hasMark(node, type)) {
		clearMark(node, type)
	} else {
		clearMark(node, type)
		addMark(node, type)
	}
}

function toggleMarkOnShape(editor: Editor, id: TLShapeId, mark: string) {
	const shape = editor.getShape(id)
	if (!shape) return
	if (shape.type === 'text') {
		const rt = structuredClone((shape as TLTextShape).props.richText)
		if (rt) {
			toggleMark(rt as any, mark)
		}
		editor.updateShape<TLTextShape>({ id, type: 'text', props: { richText: rt } })
	} else {
		editor.getSortedChildIdsForParent(id).forEach((id) => toggleMarkOnShape(editor, id, mark))
	}
}

type Style = 'bold' | 'italic' | 'highlight'

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
	if (shape?.type === 'text') {
		const rt = (shape as TLTextShape).props.richText
		return isUniformlyMarked(rt as any, style)
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
