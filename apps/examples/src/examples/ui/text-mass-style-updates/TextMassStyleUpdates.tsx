import { getSchema, JSONContent } from '@tiptap/core'
import { Fragment, Node, Schema } from '@tiptap/pm/model'
import {
	DefaultStylePanel,
	DefaultStylePanelContent,
	Editor,
	tipTapDefaultExtensions,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TLShape,
	TLShapeId,
	TLTextShape,
	TLUiStylePanelProps,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const schema = getSchema(tipTapDefaultExtensions)

type Style = 'bold' | 'italic' | 'highlight'

const STYLES: { style: Style; icon: string; label: string }[] = [
	{ style: 'bold', icon: 'bold', label: 'Bold' },
	{ style: 'italic', icon: 'italic', label: 'Italic' },
	{ style: 'highlight', icon: 'highlight', label: 'Highlight' },
]

function isRichTextShape(shape: TLShape): shape is TLTextShape {
	return 'richText' in shape.props
}

// [1]
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
function setMark(doc: Node, schema: Schema, markName: string, active: boolean): Node {
	const markType = schema.marks[markName]

	return mapTextNodes(doc, schema, (node) => {
		if (active) {
			return node.mark(markType.create().addToSet(node.marks))
		} else {
			return node.mark(node.marks.filter((m) => m.type !== markType))
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

// [2]
function setMarkOnShape(editor: Editor, id: TLShapeId, style: Style, active: boolean) {
	const shape = editor.getShape(id)
	if (!shape) return
	if (isRichTextShape(shape)) {
		const richText = shape.props.richText
		const doc = Node.fromJSON(schema, richText as JSONContent)
		const updated = setMark(doc, schema, style, active)
		editor.updateShape({
			id,
			type: shape.type,
			props: { richText: updated.toJSON() },
		})
	} else {
		editor
			.getSortedChildIdsForParent(id)
			.forEach((childId) => setMarkOnShape(editor, childId, style, active))
	}
}

function isUniformlyStyled(editor: Editor, shapeId: TLShapeId, style: Style) {
	const shape = editor.getShape(shapeId)
	if (!shape || !isRichTextShape(shape)) return false
	const doc = Node.fromJSON(schema, shape.props.richText as JSONContent)
	return isUniformlyMarked(doc, style)
}

// [3]
function CustomStylePanel(props: TLUiStylePanelProps) {
	const editor = useEditor()

	const selectedShapeIds = useValue('selected shape ids', () => editor.getSelectedShapeIds(), [
		editor,
	])

	const allTextShapeIds = useValue(
		'text shape ids',
		() => {
			const allIds = editor.getShapeAndDescendantIds(selectedShapeIds)
			return [...allIds].filter((id) => (editor.getShape(id)?.props as any).richText)
		},
		[editor, selectedShapeIds]
	)

	const hasTextShapes = allTextShapeIds.length > 0

	return (
		<DefaultStylePanel {...props}>
			{hasTextShapes && (
				<div className="tlui-style-panel__section">
					{STYLES.map(({ style, icon, label }) => (
						<StyleButton
							key={style}
							style={style}
							icon={icon}
							label={label}
							textShapeIds={allTextShapeIds}
						/>
					))}
				</div>
			)}
			<DefaultStylePanelContent />
		</DefaultStylePanel>
	)
}

// [4]
function StyleButton({
	style,
	icon,
	label,
	textShapeIds,
}: {
	style: Style
	icon: string
	label: string
	textShapeIds: TLShapeId[]
}) {
	const editor = useEditor()

	const isActive = useValue(
		`all ${style}`,
		() => textShapeIds.every((id) => isUniformlyStyled(editor, id, style)),
		[editor, textShapeIds, style]
	)

	return (
		<TldrawUiButton
			type="menu"
			data-isactive={isActive}
			onClick={() => {
				const shouldRemove = textShapeIds.every((id) => isUniformlyStyled(editor, id, style))
				editor.run(() => {
					editor.getSelectedShapeIds().forEach((id) => {
						setMarkOnShape(editor, id, style, !shouldRemove)
					})
				})
			}}
			title={`${label} all text in selected shapes`}
		>
			<TldrawUiButtonIcon icon={icon} />
			<TldrawUiButtonLabel>{label} All</TldrawUiButtonLabel>
		</TldrawUiButton>
	)
}

const components: TLComponents = {
	StylePanel: CustomStylePanel,
}

export default function TextMassStyleUpdatesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="mass-style-updates-example" components={components} />
		</div>
	)
}

/*
This example shows how to add buttons to the style panel that toggle rich text marks
(bold, italic, highlight) on all text within selected shapes at once, using ProseMirror's
Node API.

[1]
We use ProseMirror's Node.fromJSON to parse the rich text content from shape props into
a proper document node. This gives us access to the built-in mark utilities for checking
and manipulating marks, rather than manually traversing the JSON structure.

[2]
setMarkOnShape handles both text shapes (by setting the mark on the rich text document)
and parent shapes like frames (by recursing into children). The add/remove decision is
made globally: if all text in all selected shapes already has the mark, it's removed from
all of them; otherwise it's added to all of them.

[3]
We override the StylePanel component to add our custom buttons above the default style
panel content. The buttons only appear when the selection includes text shapes.

[4]
Each style button uses useValue to reactively check whether all selected text shapes
are uniformly styled, keeping the active state in sync with the document.
*/
