import { getSchema, JSONContent } from '@tiptap/core'
import { Fragment, Node, Schema } from '@tiptap/pm/model'
import {
	DefaultStylePanel,
	DefaultStylePanelContent,
	Editor,
	ExtractShapeByProps,
	tipTapDefaultExtensions,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TLRichText,
	TLShape,
	TLShapeId,
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

type RichTextShape = ExtractShapeByProps<{ richText: TLRichText }>

function isRichTextShape(shape: TLShape): shape is RichTextShape {
	return 'richText' in shape.props
}

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

// [1]
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
			return [...allIds].filter((id) => {
				const shape = editor.getShape(id)
				return !!shape && isRichTextShape(shape)
			})
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
			isActive={isActive}
			onClick={() => {
				editor.run(() => {
					editor.markHistoryStoppingPoint(`toggle ${style}`)
					editor.getSelectedShapeIds().forEach((id) => {
						setMarkOnShape(editor, id, style, !isActive)
					})
				})
			}}
			title={`${label} all text in selected shapes`}
		>
			<TldrawUiButtonIcon icon={icon} />
			<TldrawUiButtonLabel>{label} all</TldrawUiButtonLabel>
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
This example adds bold, italic, and highlight buttons to the style panel that
toggle the mark on all text in the selected shapes at once, including text
shapes nested inside selected frames and groups. Rich text is a TipTap
(ProseMirror) JSON document; rather than walk the JSON by hand we parse it into
a ProseMirror `Node` and use its mark API. For a hand-rolled JSON version, see
the "Format rich text on multiple shapes" example.

[1]
`setMark` and `mapTextNodes` rebuild a ProseMirror document with each text
node's marks changed. ProseMirror nodes are immutable, so we return a new tree
rather than mutating in place.

[2]
`setMarkOnShape` parses `shape.props.richText` with `Node.fromJSON`, using the
schema built from tldraw's default TipTap extensions, and writes the result back
with `toJSON()`. It handles both shapes with rich text (by rewriting the document)
and container shapes like frames and groups (by recursing into their children
via `getSortedChildIdsForParent`). The add/remove decision is made once per
click: if every text node in every selected shape already has the mark, remove
it everywhere; otherwise add it everywhere.

[3]
The custom `StylePanel` wraps `DefaultStylePanel` and adds a section above the
default content. `getShapeAndDescendantIds` expands the selection to include
nested shapes so the buttons appear when a frame containing text is selected.

[4]
Each button reads its active state inside `useValue`, so it stays in sync as
the selection or the shapes' text changes. Reactivity here comes from
`editor.getShape` being read inside the computation.
*/
