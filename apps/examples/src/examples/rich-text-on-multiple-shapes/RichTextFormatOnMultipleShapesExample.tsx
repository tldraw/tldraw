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

/**
 * Recursively processes rich text content to make all text nodes bold.
 * Preserves the structure of the document while adding bold marks to all text.
 */
function makeAllTextBold(richText: TLRichText): TLRichText {
	if (!richText || !richText.content) {
		return richText
	}

	const processNode = (node: any): any => {
		if (node.type === 'text') {
			// Check if bold mark already exists
			const hasBold = node.marks?.some((mark: any) => mark.type === 'bold')
			if (hasBold) {
				return node
			}
			// Add bold mark to text node
			return {
				...node,
				marks: [...(node.marks || []), { type: 'bold' }],
			}
		}

		if (node.content && Array.isArray(node.content)) {
			// Recursively process child nodes
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

/**
 * Recursively checks if all text nodes in rich text have bold marks.
 */
function isAllTextBold(richText: TLRichText): boolean {
	if (!richText || !richText.content) {
		return false
	}

	const checkNode = (node: any): boolean => {
		if (node.type === 'text') {
			// If it's a text node, check if it has a bold mark
			const hasBold = node.marks?.some((mark: any) => mark.type === 'bold')
			return hasBold
		}

		if (node.content && Array.isArray(node.content)) {
			// Recursively check child nodes
			return node.content.every(checkNode)
		}

		// Non-text nodes without content are considered "bold" (they don't need bold)
		return true
	}

	return richText.content.every(checkNode)
}

/**
 * Removes bold marks from all text nodes in rich text.
 */
function removeBoldFromAllText(richText: TLRichText): TLRichText {
	if (!richText || !richText.content) {
		return richText
	}

	const processNode = (node: any): any => {
		if (node.type === 'text') {
			// Remove bold marks from text node
			const marks = node.marks?.filter((mark: any) => mark.type !== 'bold') || []
			return {
				...node,
				marks: marks.length > 0 ? marks : undefined,
			}
		}

		if (node.content && Array.isArray(node.content)) {
			// Recursively process child nodes
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

function CustomStylePanel(props: TLUiStylePanelProps) {
	const editor = useEditor()

	// Get currently selected shapes
	const selectedShapes = useValue('selected shapes', () => editor.getSelectedShapes(), [editor])

	// Filter to only shapes with rich text
	const shapesWithRichText = selectedShapes.filter(isShapeWithRichText)
	const hasRichTextSelection = shapesWithRichText.length > 0

	// Check if all selected shapes with rich text have all their text bold
	const allBold = useValue(
		'all bold',
		() => {
			if (shapesWithRichText.length === 0) return false
			return shapesWithRichText.every((shape) => {
				const richText = shape.props.richText
				return richText && isAllTextBold(richText)
			})
		},
		[shapesWithRichText]
	)

	const handleToggleBold = () => {
		if (!hasRichTextSelection) return

		editor.run(() => {
			shapesWithRichText.forEach((shape) => {
				const richText = shape.props.richText
				if (!richText) return

				const newRichText = allBold ? removeBoldFromAllText(richText) : makeAllTextBold(richText)

				editor.updateShape({
					id: shape.id,
					type: shape.type,
					props: { richText: newRichText },
				})
			})
		})
	}

	return (
		<DefaultStylePanel {...props}>
			<div className="tlui-style-panel__section">
				<TldrawUiButton
					type="menu"
					data-isactive={allBold}
					onClick={handleToggleBold}
					title="Bold all text in selected shapes"
					disabled={!hasRichTextSelection}
				>
					<TldrawUiButtonIcon icon="bold" />
					<TldrawUiButtonLabel>Bold All Text</TldrawUiButtonLabel>
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
