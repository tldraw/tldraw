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
import './OutlinedTextExample.css'

// There's a guide at the bottom of this file!

interface OutlineExtensionOptions {
	HTMLAttributes: object
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		outline: {
			setOutline(): ReturnType
			toggleOutline(): ReturnType
			unsetOutline(): ReturnType
		}
	}
}

// [1]
const Outline = Mark.create<OutlineExtensionOptions>({
	name: 'outline',

	addOptions() {
		return {
			HTMLAttributes: {},
		}
	},

	parseHTML() {
		return [
			{
				tag: 'span.outlined',
			},
		]
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(this.options.HTMLAttributes, { class: 'outlined filled' }, HTMLAttributes),
			0,
		]
	},

	addCommands() {
		return {
			setOutline:
				() =>
				({ commands }) =>
					commands.setMark(this.name),
			toggleOutline:
				() =>
				({ commands }) =>
					commands.toggleMark(this.name),
			unsetOutline:
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
					title="Toggle text outline"
					onClick={() => {
						textEditor.chain().focus().toggleOutline().run()
					}}
					isActive={textEditor.isActive('outline')}
					onPointerDown={preventDefault}
				>
					⬜
				</TldrawUiButton>
				<DefaultRichTextToolbarContent textEditor={textEditor} />
			</DefaultRichTextToolbar>
		)
	},
}

// [4]
const options = {
	text: {
		tipTapConfig: {
			extensions: [...tipTapDefaultExtensions, Outline],
		},
	},
}

export default function OutlinedTextExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="outlined-text-example" components={components} options={options} />
		</div>
	)
}

/*
[1]
A TipTap mark extension. It renders as `<span class="outlined filled">`, and the outline effect
itself is plain CSS (`-webkit-text-stroke`) in OutlinedTextExample.css. The `declare module`
block above registers the mark's commands with TypeScript.

[2]
Override the `RichTextToolbar` component. `DefaultRichTextToolbar` positions the toolbar over
the selection; inside it we add our toggle button and keep the default buttons via
`DefaultRichTextToolbarContent`. `editor.getRichTextEditor()` is the TipTap editor for the
text being edited, or null when nothing is being edited.

[3]
The transaction re-render and the pointer-down `preventDefault` are the same as in the
rich text custom extension example; see its footnotes [3] and [4] for why.

[4]
Pass extensions through `options.text.tipTapConfig`. Spread `tipTapDefaultExtensions` so
tldraw's own StarterKit configuration and extras stay in place.
*/
