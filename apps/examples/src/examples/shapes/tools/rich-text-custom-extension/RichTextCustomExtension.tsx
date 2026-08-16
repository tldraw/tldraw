import { Mark, mergeAttributes } from '@tiptap/core'
import { useEffect, useState } from 'react'
import {
	DefaultRichTextToolbar,
	DefaultRichTextToolbarContent,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	preventDefault,
	tipTapDefaultExtensions,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './RichTextCustomExtension.css'

// There's a guide at the bottom of this file!

interface WavyExtensionOptions {
	HTMLAttributes: object
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		wavy: {
			setWavy(): ReturnType
			toggleWavy(): ReturnType
			unsetWavy(): ReturnType
		}
	}
}

// [1]
const Wavy = Mark.create<WavyExtensionOptions>({
	name: 'wavy',

	addOptions() {
		return {
			HTMLAttributes: {},
		}
	},

	parseHTML() {
		return [
			{
				tag: 'span.wavy',
			},
		]
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(this.options.HTMLAttributes, { class: 'wavy' }, HTMLAttributes),
			0,
		]
	},

	addCommands() {
		return {
			setWavy:
				() =>
				({ commands }) =>
					commands.setMark(this.name),
			toggleWavy:
				() =>
				({ commands }) =>
					commands.toggleMark(this.name),
			unsetWavy:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name),
		}
	},
})

// [2]
const components: TLComponents = {
	RichTextToolbar: () => {
		const editor = useEditor()
		const textEditor = useValue('textEditor', () => editor.getRichTextEditor(), [editor])

		// [3]
		const [, forceUpdate] = useState(0)
		useEffect(() => {
			if (!textEditor) return
			const handleUpdate = () => forceUpdate((n) => n + 1)
			textEditor.on('transaction', handleUpdate)
			return () => {
				textEditor.off('transaction', handleUpdate)
			}
		}, [textEditor])

		if (!textEditor) return null

		return (
			<DefaultRichTextToolbar>
				<TldrawUiButton
					type="icon"
					title="Toggle wavy underline"
					onClick={() => {
						textEditor.chain().focus().toggleWavy().run()
					}}
					isActive={textEditor.isActive('wavy')}
					// [4]
					onPointerDown={preventDefault}
				>
					〰️
				</TldrawUiButton>
				<DefaultRichTextToolbarContent textEditor={textEditor} />
			</DefaultRichTextToolbar>
		)
	},
}

// [5]
const options = {
	text: {
		tipTapConfig: {
			extensions: [...tipTapDefaultExtensions, Wavy],
		},
	},
}

export default function RichTextCustomExtensionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="rich-text-custom-extension"
				components={components}
				options={options}
			/>
		</div>
	)
}

/*
[1]
A TipTap mark extension. It renders as a `<span class="wavy">` (styled in
RichTextCustomExtension.css) and adds `setWavy` / `toggleWavy` / `unsetWavy` commands. The
`declare module '@tiptap/core'` block above tells TypeScript about those commands so
`textEditor.chain().toggleWavy()` type checks.

[2]
Replace the rich text toolbar with our own. `DefaultRichTextToolbar` handles positioning the
toolbar over the text selection; we render our custom button plus the default bold/italic/etc
buttons via `DefaultRichTextToolbarContent`. `editor.getRichTextEditor()` is the TipTap editor
for the text currently being edited, or null when no text is being edited.

[3]
The TipTap editor isn't a tldraw signal, so `isActive` wouldn't otherwise refresh as the
selection moves in and out of marked text. Re-render on every TipTap transaction so the
button's active state stays in sync.

[4]
Preventing the default on pointer down keeps the toolbar button from taking focus away from
the text editor, which would collapse the selection before the command runs.

[5]
Pass the extension list through `options.text.tipTapConfig`. Spread `tipTapDefaultExtensions`
so tldraw's own configuration (StarterKit settings, highlight, keyboard tweaks) stays in place;
passing a bare `StarterKit` instead would drop those.
*/
