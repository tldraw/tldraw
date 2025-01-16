import { EditorEvents as TextEditorEvents } from '@tiptap/core'
import FontFamily from '@tiptap/extension-font-family'
import TextStyle from '@tiptap/extension-text-style'
import { EditorState as TextEditorState } from '@tiptap/pm/state'
import { useEffect, useState } from 'react'
import {
	DefaultRichTextToolbar,
	DefaultRichTextToolbarContent,
	TLComponents,
	Tldraw,
	tipTapDefaultExtensions,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { FontSize } from './FontSizeExtension'
import './RichTextFontExtension.css'

const fontOptions = [
	{ label: 'Inter', value: 'Inter' },
	{ label: 'Comic Sans MS', value: 'Comic Sans MS' },
	{ label: 'serif', value: 'serif' },
	{ label: 'monospace', value: 'monospace' },
	{ label: 'cursive', value: 'cursive' },
	{ label: 'Helvetica (CSS var)', value: 'var(--title-font-family)' },
	{ label: 'Exo 2 (Google Font)', value: "'Exo 2'" },
]

const fontSizeOptions = [
	{ label: 'Small', value: '12px' },
	{ label: 'Normal', value: '16px' },
	{ label: 'Large', value: '20px' },
	{ label: 'X-Large', value: '24px' },
	{ label: 'XX-Large', value: '28px' },
	{ label: 'Huge', value: '32px' },
]

const components: TLComponents = {
	RichTextToolbar: () => {
		const editor = useEditor()
		const textEditor = useValue('textEditor', () => editor.getEditingShapeTipTapTextEditor(), [
			editor,
		])
		const [_, setTextEditorState] = useState<TextEditorState | null>(textEditor?.state ?? null)

		// Set up text editor transaction listener.
		useEffect(() => {
			if (!textEditor) {
				setTextEditorState(null)
				return
			}

			const handleTransaction = ({ editor: textEditor }: TextEditorEvents['transaction']) => {
				setTextEditorState(textEditor.state)
			}

			textEditor.on('transaction', handleTransaction)
			return () => {
				textEditor.off('transaction', handleTransaction)
				setTextEditorState(null)
			}
		}, [textEditor])

		if (!textEditor) return null

		const currentFontFamily = textEditor?.getAttributes('textStyle').fontFamily
		const currentFontSize = textEditor?.getAttributes('textStyle').fontSize

		return (
			<DefaultRichTextToolbar>
				<select
					value={currentFontFamily}
					onChange={(e) => {
						textEditor?.chain().focus().setFontFamily(e.target.value).run()
					}}
				>
					{fontOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				<select
					value={currentFontSize}
					onChange={(e) => {
						textEditor?.chain().focus().setFontSize(e.target.value).run()
					}}
				>
					{fontSizeOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				{/* Add the DefaultRichTextToolbarContent if you want to add more items. */}
				<DefaultRichTextToolbarContent textEditor={textEditor} />
			</DefaultRichTextToolbar>
		)
	},
}

const textOptions = {
	tipTapConfig: {
		extensions: [...tipTapDefaultExtensions, FontFamily, FontSize, TextStyle],
	},
}

export default function RichTextFontExtensionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="rich-text-font-extension"
				components={components}
				textOptions={textOptions}
			/>
		</div>
	)
}

/*
This example shows how to set font family and font size properties on the TipTap editor.
*/
