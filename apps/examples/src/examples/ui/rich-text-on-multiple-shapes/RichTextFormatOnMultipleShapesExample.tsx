import {
	DefaultStylePanel,
	DefaultStylePanelContent,
	ExtractShapeByProps,
	TLComponents,
	TLRichText,
	TLShape,
	TLUiStylePanelProps,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

type ShapeWithRichText = ExtractShapeByProps<{ richText: TLRichText }>

function isShapeWithRichText(shape: TLShape | null | undefined): shape is ShapeWithRichText {
	return !!(shape && 'richText' in shape.props)
}

// [1]
function makeAllTextBold(richText: TLRichText): TLRichText {
	if (!richText || !richText.content) {
		return richText
	}

	const processNode = (node: any): any => {
		if (node.type === 'text') {
			const hasBold = node.marks?.some((mark: any) => mark.type === 'bold')
			if (hasBold) {
				return node
			}
			return {
				...node,
				marks: [...(node.marks || []), { type: 'bold' }],
			}
		}

		if (node.content && Array.isArray(node.content)) {
			return {
				...node,
				content: node.content.map(processNode),
			}
		}

		return node
	}

	return {
		...richText,
		content: richText.content.map(processNode),
	}
}

function isAllTextBold(richText: TLRichText): boolean {
	if (!richText || !richText.content) {
		return false
	}

	const checkNode = (node: any): boolean => {
		if (node.type === 'text') {
			return node.marks?.some((mark: any) => mark.type === 'bold') ?? false
		}

		if (node.content && Array.isArray(node.content)) {
			return node.content.every(checkNode)
		}

		// Leaf nodes without text (hard breaks, etc.) have nothing to bold
		return true
	}

	return richText.content.every(checkNode)
}

function removeBoldFromAllText(richText: TLRichText): TLRichText {
	if (!richText || !richText.content) {
		return richText
	}

	const processNode = (node: any): any => {
		if (node.type === 'text') {
			const marks = node.marks?.filter((mark: any) => mark.type !== 'bold') || []
			return {
				...node,
				marks: marks.length > 0 ? marks : undefined,
			}
		}

		if (node.content && Array.isArray(node.content)) {
			return {
				...node,
				content: node.content.map(processNode),
			}
		}

		return node
	}

	return {
		...richText,
		content: richText.content.map(processNode),
	}
}

// [2]
function CustomStylePanel(props: TLUiStylePanelProps) {
	const editor = useEditor()

	const shapesWithRichText = useValue(
		'shapes with rich text',
		() => editor.getSelectedShapes().filter(isShapeWithRichText),
		[editor]
	)
	const hasRichTextSelection = shapesWithRichText.length > 0

	const allBold =
		hasRichTextSelection && shapesWithRichText.every((shape) => isAllTextBold(shape.props.richText))

	const handleToggleBold = () => {
		if (!hasRichTextSelection) return

		// [3]
		editor.run(() => {
			editor.markHistoryStoppingPoint('toggle bold')
			editor.updateShapes(
				shapesWithRichText.map((shape) => ({
					id: shape.id,
					type: shape.type,
					props: {
						richText: allBold
							? removeBoldFromAllText(shape.props.richText)
							: makeAllTextBold(shape.props.richText),
					},
				}))
			)
		})
	}

	return (
		<DefaultStylePanel {...props}>
			<div className="tlui-style-panel__section">
				<TldrawUiButton
					type="menu"
					isActive={allBold}
					onClick={handleToggleBold}
					title="Bold all text in selected shapes"
					disabled={!hasRichTextSelection}
				>
					<TldrawUiButtonIcon icon="bold" />
					<TldrawUiButtonLabel>Bold all text</TldrawUiButtonLabel>
				</TldrawUiButton>
			</div>
			<DefaultStylePanelContent />
		</DefaultStylePanel>
	)
}

const components: TLComponents = {
	StylePanel: CustomStylePanel,
}

export default function RichTextFormatOnMultipleShapesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
This example adds a "Bold all text" toggle to the style panel that applies to
every selected shape with rich text at once. Rich text in tldraw is a TipTap
(ProseMirror) JSON document; each text node can carry a `marks` array such as
`[{ type: 'bold' }]`. Here we walk that JSON directly. For a version that uses
ProseMirror's Node API instead, see the "Text mass style updates" example.

[1]
The helpers recursively map over the document, adding or removing the bold mark
on text nodes and leaving the structure untouched. `isAllTextBold` is the
inverse check that decides whether the button should add or remove bold.

[2]
`ExtractShapeByProps<{ richText: TLRichText }>` narrows to any shape whose props
include rich text (text, geo, note, arrow), so the panel works across shape
types. Reading the selection inside `useValue` keeps the button state in sync
as the selection or the shapes' text changes.

[3]
`editor.updateShapes` applies all the changes in one go, and the history stopping
point makes the whole toggle a single undo step. Shapes are never mutated
directly; we always pass a new `richText` object through the editor.
*/
