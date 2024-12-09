import { Mark, Editor as TextEditor, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {
	DefaultRichTextToolbar,
	TLComponents,
	Tldraw,
	TldrawUiButton,
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
		const textEditor: TextEditor = useValue(
			'textEditor',
			() => editor.getEditingShapeTextEditor(),
			[editor]
		)

		return (
			<DefaultRichTextToolbar>
				<TldrawUiButton
					type="icon"
					onClick={() => {
						textEditor.chain().focus().toggleWavy().run()
					}}
				>
					〰️
				</TldrawUiButton>
				{/* Add the DefaultRichTextToolbarItems if you want to add more items. */}
				{/* <DefaultRichTextToolbarItems textEditor={textEditor} onEditLinkIntent={() => {}} /> */}
			</DefaultRichTextToolbar>
		)
	},
}

export default function ReadOnlyExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="rich-text-custom-extension"
				components={components}
				textOptions={{
					tipTapConfig: {
						extensions: [StarterKit, Wavy],
					},
				}}
			/>
		</div>
	)
}

/*
This example shows how to set custom properties on the TipTap editor.
*/
