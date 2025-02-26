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
import './RichTextCustomExtension.css'

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
				({ commands }: any) =>
					commands.toggleMark(this.name),
			unsetWavy:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name),
		}
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
						textEditor?.chain().focus().toggleWavy().run()
					}}
					isActive={textEditor?.isActive('wavy')}
					onPointerDown={preventDefault}
				>
					〰️
				</TldrawUiButton>
				{/* Add the DefaultRichTextToolbarContent if you want to add more items. */}
				{/* <DefaultRichTextToolbarContent textEditor={textEditor} onEditLinkIntent={() => {}} /> */}
			</DefaultRichTextToolbar>
		)
	},
}

const textOptions = {
	tipTapConfig: {
		extensions: [StarterKit, Wavy],
	},
}

export default function RichTextCustomExtensionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="rich-text-custom-extension"
				components={components}
				textOptions={textOptions}
			/>
		</div>
	)
}

/*
This example shows how to set custom properties on the TipTap editor.
*/
