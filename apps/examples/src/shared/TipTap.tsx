import { EditorContent, useEditor as useTipTapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useEffect } from 'react'
import {
	Box,
	TLDefaultColorStyle,
	TLDefaultFontStyle,
	TLDefaultHorizontalAlignStyle,
	TLDefaultVerticalAlignStyle,
	TLShapeId,
	TLUnknownShape,
	getPointerInfo,
	stopEventPropagation,
	useEditor as useTldrawEditor,
	useValue,
} from 'tldraw'
import { useDefaultColorTheme } from 'tldraw/src/lib/shapes/shared/ShapeFill'
import './TipTap.css'

const extensions = [StarterKit]

// This follows the boilerplate example of TipTap editor on https://tiptap.dev/docs/editor/installation/react
const Tiptap = ({
	id,
	type,
	content,
	labelColor,
	font,
	fontSize,
	lineHeight,
	align,
	verticalAlign,
	wrap,
	bounds,
}: {
	id: TLShapeId
	type: string
	content: string
	labelColor: TLDefaultColorStyle
	font: TLDefaultFontStyle
	fontSize: number
	lineHeight: number
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
	wrap?: boolean
	bounds?: Box
}) => {
	const theme = useDefaultColorTheme()

	const tldrawEditor = useTldrawEditor()
	const isEditing = useValue('isEditing', () => tldrawEditor.getEditingShapeId() === id, [
		tldrawEditor,
		id,
	])
	const tiptapEditor = useTipTapEditor({
		extensions,
		content,
		autofocus: true,
		onUpdate: ({ editor }) => {
			const html = editor.getHTML()
			tldrawEditor.updateShapes<TLUnknownShape & { props: { text: string } }>([
				{ id, type, props: { text: html } },
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
				shape: tldrawEditor.getShape(id)!,
			})

			stopEventPropagation(e) // we need to prevent blurring the input
		},
		[tldrawEditor, id]
	)

	return (
		<div
			key={`tl-tiptap-${isEditing}`}
			className="tl-text-label tl-text-wrapper"
			data-font={font}
			data-align={align}
			data-textwrap={!!wrap}
			style={{
				pointerEvents: isEditing ? 'all' : 'none',
				userSelect: isEditing ? 'all' : 'none',
				justifyContent: align === 'middle' ? 'center' : align,
				alignItems: verticalAlign === 'middle' ? 'center' : verticalAlign,
				...(bounds
					? {
							top: bounds.minY,
							left: bounds.minX,
							width: bounds.width,
							height: bounds.height,
							position: 'absolute',
						}
					: {}),
			}}
		>
			<div
				className="tl-text-label__inner"
				style={{
					pointerEvents: isEditing ? 'all' : 'none',
					userSelect: isEditing ? 'all' : 'none',
					fontSize,
					lineHeight: fontSize * lineHeight + 'px',
					minHeight: lineHeight + 32,
					minWidth: 0,
					color: theme[labelColor as TLDefaultColorStyle].solid,
				}}
				onPointerDown={handleInputPointerDown}
			>
				<EditorContent editor={tiptapEditor} />
			</div>
		</div>
	)
}

export default Tiptap
