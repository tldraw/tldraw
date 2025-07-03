import { Mark, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {
	DefaultRichTextToolbar,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	preventDefault,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './OutlinedTextExample.css'

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
				({ commands }: any) =>
					commands.toggleMark(this.name),
			unsetOutline:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name),
		}
	},

	onCreate() {
		this.editor.commands.toggleMark('outline')
	},
})

const components: TLComponents = {
	RichTextToolbar: () => {
		const editor = useEditor()
		const textEditor = useValue('textEditor', () => editor.getRichTextEditor(), [editor])

		return (
			<DefaultRichTextToolbar>
				<TldrawUiButton
					type="icon"
					onClick={() => {
						textEditor?.chain().focus().toggleOutline().run()
					}}
					isActive={textEditor?.isActive('outline')}
					onPointerDown={preventDefault}
					title="Toggle text outline"
				>
					⬜
				</TldrawUiButton>
			</DefaultRichTextToolbar>
		)
	},
}

const textOptions = {
	tipTapConfig: {
		extensions: [StarterKit, Outline],
	},
}

export default function OutlinedTextExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="outlined-text-example"
				components={components}
				textOptions={textOptions}
			/>
		</div>
	)
}

/*
This example shows how to add outlined text styling using a custom TipTap extension.
The outline effect is created using CSS text-stroke properties.
*/
