import { FontFamily } from '@tiptap/extension-font-family'
import { TextStyleKit } from '@tiptap/extension-text-style'
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
import { extensionFontFamilies } from './fonts'
import './RichTextFontExtension.css'
import { FontSize } from './FontSizeExtension'

// There's a guide at the bottom of this file!

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

// [1]
const components: TLComponents = {
	RichTextToolbar: () => {
		const editor = useEditor()
		const textEditor = useValue('textEditor', () => editor.getRichTextEditor(), [editor])

		// [2]
		const [, forceUpdate] = useState(0)
		useEffect(() => {
			if (!textEditor) return
			const handleTransaction = () => forceUpdate((n) => n + 1)
			textEditor.on('transaction', handleTransaction)
			return () => {
				textEditor.off('transaction', handleTransaction)
			}
		}, [textEditor])

		if (!textEditor) return null

		const currentFontFamily = textEditor.getAttributes('textStyle').fontFamily ?? 'DEFAULT'
		const currentFontSize = textEditor.getAttributes('textStyle').fontSize ?? '16px'

		return (
			<DefaultRichTextToolbar>
				<select
					className="rich-text-font-extension-select"
					value={currentFontFamily}
					// [3]
					onPointerDown={editor.markEventAsHandled}
					onChange={(e) => {
						textEditor.chain().focus().setFontFamily(e.target.value).run()
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
						textEditor.chain().focus().setFontSize(e.target.value).run()
					}}
				>
					{fontSizeOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				<DefaultRichTextToolbarContent textEditor={textEditor} />
			</DefaultRichTextToolbar>
		)
	},
}

// [4]
const textOptions: Partial<TLTextOptions> = {
	tipTapConfig: {
		extensions: [...tipTapDefaultExtensions, FontFamily, FontSize, TextStyleKit],
	},
	// [5]
	addFontsFromNode(node, state, addFont) {
		state = defaultAddFontsFromNode(node, state, addFont)

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

		const font = extensionFontFamilies[state.family]?.[state.style]?.[state.weight]
		if (font) addFont(font)

		return state
	},
}

const options = { text: textOptions }

// [6]
const fontFaces = Object.values(extensionFontFamilies)
	.flatMap((fontFamily) => Object.values(fontFamily))
	.flatMap((fontStyle) => Object.values(fontStyle))

function onMount(editor: Editor) {
	editor.fonts.requestFonts(fontFaces)
}

// [7]
const assetUrls = {
	fonts: {
		tldraw_mono: extensionFontFamilies["'Exo 2'"].normal.normal.src.url,
	},
}

export default function RichTextFontExtensionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="rich-text-font-extension"
				components={components}
				options={options}
				assetUrls={assetUrls}
				onMount={onMount}
			/>
		</div>
	)
}

/*
[1]
Replace the rich text toolbar. `DefaultRichTextToolbar` positions the toolbar over the text
selection; inside it we add two `<select>`s and keep the default buttons with
`DefaultRichTextToolbarContent`. `editor.getRichTextEditor()` is the TipTap editor for the text
being edited, or null when nothing is being edited.

[2]
The TipTap editor isn't a tldraw signal, so the selects wouldn't otherwise update as the caret
moves between differently styled text. Re-render on every TipTap transaction so
`getAttributes('textStyle')` reflects the current selection.

[3]
Marking the pointer down as handled keeps the canvas from treating a click on the select as a
click on the shape behind it, which would end text editing.

[4]
The font extensions are TipTap's stock `FontFamily` and `TextStyleKit` plus a small `FontSize`
extension (see FontSizeExtension.ts). Spread `tipTapDefaultExtensions` first so tldraw's own
StarterKit configuration and extras stay in place.

[5]
`addFontsFromNode` is how tldraw finds out which fonts a piece of rich text uses, so it can
load them before rendering and embed them in SVG exports. The default handles tldraw's own
fonts; we extend it to walk the `textStyle` mark for a `fontFamily` attribute and, when it
matches one of our font families, add the matching `TLFontFace` to the document.

[6]
Preload every custom font on mount so switching families in the toolbar doesn't flash
unstyled text while the font downloads.

[7]
`assetUrls.fonts` overrides tldraw's built-in fonts. Here we point the mono font at Exo 2 to
show that the same font files can also replace a default font.
*/
