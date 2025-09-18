import { EditorEvents as TextEditorEvents } from '@tiptap/core'
import FontFamily from '@tiptap/extension-font-family'
import TextStyle from '@tiptap/extension-text-style'
import { EditorState as TextEditorState } from '@tiptap/pm/state'
import { useEffect, useState } from 'react'
import {
	DefaultRichTextToolbar,
	DefaultRichTextToolbarContent,
	Editor,
	TLComponents,
	TLTextOptions,
	Tldraw,
	defaultAddFontsFromNode,
	tipTapDefaultExtensions,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { FontSize } from './FontSizeExtension'
import './RichTextFontExtension.css'
import { extensionFontFamilies } from './fonts'

const fontOptions = [
	{ label: 'Default', value: 'DEFAULT' },
	{ label: 'Inter', value: 'Inter' },
	{ label: 'Comic Sans MS', value: 'Comic Sans MS' },
	{ label: 'serif', value: 'serif' },
	{ label: 'monospace', value: 'monospace' },
	{ label: 'cursive', value: 'cursive' },
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
		const textEditor = useValue('textEditor', () => editor.getRichTextEditor(), [editor])
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

		const currentFontFamily = textEditor?.getAttributes('textStyle').fontFamily ?? 'DEFAULT'
		const currentFontSize = textEditor?.getAttributes('textStyle').fontSize

		return (
			<DefaultRichTextToolbar>
				<select
					className="rich-text-font-extension-select"
					value={currentFontFamily}
					onPointerDown={editor.markEventAsHandled}
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
					className="rich-text-font-extension-select"
					value={currentFontSize}
					onPointerDown={editor.markEventAsHandled}
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

const textOptions: Partial<TLTextOptions> = {
	tipTapConfig: {
		extensions: [...tipTapDefaultExtensions, FontFamily, FontSize, TextStyle],
	},
	addFontsFromNode(node, state, addFont) {
		state = defaultAddFontsFromNode(node, state, addFont)

		// if we have a font-family attribute, keep track of that in the state so it applies to children
		for (const mark of node.marks) {
			if (
				mark.type.name === 'textStyle' &&
				mark.attrs.fontFamily &&
				mark.attrs.fontFamily !== 'DEFAULT' &&
				mark.attrs.fontFamily !== state.family
			) {
				state = { ...state, family: mark.attrs.fontFamily }
			}
		}

		// if one of our extension font families matches the current state, add that font to the document.
		const font = extensionFontFamilies[state.family]?.[state.style]?.[state.weight]
		if (font) addFont(font)

		return state
	},
}

export default function RichTextFontExtensionExample() {
	const fontFaces = Object.values(extensionFontFamilies)
		.map((fontFamily) => Object.values(fontFamily))
		.flat()
		.map((fontStyle) => Object.values(fontStyle))
		.flat()

	// We need to preload the fonts so that they are available when
	// making font changes. This is to avoid any FOUC as you change the
	// font families.
	const onMount = (editor: Editor) => {
		editor.fonts.requestFonts(fontFaces)
	}

	const exoFont = extensionFontFamilies["'Exo 2'"].normal.normal.src.url

	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="rich-text-font-extension"
				components={components}
				textOptions={textOptions}
				// If you want to override one of the custom fonts,
				// you can do so by providing an assetUrls prop.
				assetUrls={{
					fonts: {
						tldraw_mono: exoFont,
					},
				}}
				onMount={onMount}
			/>
		</div>
	)
}

/*
This example shows how to set font family and font size properties on the TipTap editor.
*/
