import { EditorContent, useEditor as useTipTapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useEffect } from 'react'
import {
	LABEL_FONT_SIZES,
	TEXT_PROPS,
	TLDefaultColorStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultSizeStyle,
	TLDefaultVerticalAlignStyle,
	TLShape,
	TLUnknownShape,
	getPointerInfo,
	stopEventPropagation,
	useEditor as useTldrawEditor,
	useValue,
} from 'tldraw'
import { useDefaultColorTheme } from 'tldraw/src/lib/shapes/shared/ShapeFill'

const extensions = [StarterKit]

// This follows the boilerplate example of TipTap editor on https://tiptap.dev/docs/editor/installation/react
const Tiptap = ({
	shape,
	content,
	color,
	font,
	size,
	align,
	verticalAlign,
}: {
	shape: TLShape
	content: string
	size: TLDefaultSizeStyle
	color: TLDefaultColorStyle
	font: TLDefaultFontStyle
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
}) => {
	const theme = useDefaultColorTheme()

	const tldrawEditor = useTldrawEditor()
	const isEditing = useValue('isEditing', () => tldrawEditor.getEditingShapeId() === shape.id, [
		tldrawEditor,
		shape.id,
	])
	const tiptapEditor = useTipTapEditor({
		extensions,
		content,
		autofocus: true,
		onUpdate: ({ editor }) => {
			const html = editor.getHTML()
			tldrawEditor.updateShapes<TLUnknownShape & { props: { text: string } }>([
				{ id: shape.id, type: shape.type, props: { text: html } },
			])
		},
		onBlur: () => {
			tldrawEditor.complete()
		},
	})

	useEffect(() => {
		if (tiptapEditor?.getHTML() !== content) {
			tiptapEditor?.commands.setContent(content)
		}
	}, [tiptapEditor, content])

	useEffect(() => {
		if (isEditing && !tiptapEditor?.isFocused) {
			tiptapEditor?.commands.focus('end')
		}
	}, [tiptapEditor, isEditing])

	const handleInputPointerDown = useCallback(
		(e: React.PointerEvent) => {
			tldrawEditor.dispatch({
				...getPointerInfo(e),
				type: 'pointer',
				name: 'pointer_down',
				target: 'shape',
				shape: tldrawEditor.getShape(shape.id)!,
			})

			stopEventPropagation(e) // we need to prevent blurring the input
		},
		[tldrawEditor, shape.id]
	)

	// TODO need to handleInputPointerDown like in useEditableText?
	// TODO need to handleDoubleClick like in useEditableText?

	return (
		<div
			className="tl-text-label"
			data-font={font}
			data-align={align}
			style={{
				pointerEvents: isEditing ? 'all' : 'none',
				userSelect: isEditing ? 'all' : 'none',
				justifyContent: align === 'middle' ? 'center' : align,
				alignItems: verticalAlign === 'middle' ? 'center' : verticalAlign,
			}}
		>
			<div
				className="tl-text-label__inner"
				style={{
					pointerEvents: isEditing ? 'all' : 'none',
					userSelect: isEditing ? 'all' : 'none',
					fontSize: LABEL_FONT_SIZES[size as TLDefaultSizeStyle],
					lineHeight: LABEL_FONT_SIZES[size as TLDefaultSizeStyle] * TEXT_PROPS.lineHeight + 'px',
					minHeight: TEXT_PROPS.lineHeight + 32,
					minWidth: 0,
					color: theme[color as TLDefaultColorStyle].solid,
				}}
				onPointerDown={handleInputPointerDown}
			>
				<EditorContent editor={tiptapEditor} />
			</div>
		</div>
	)
}

export default Tiptap
