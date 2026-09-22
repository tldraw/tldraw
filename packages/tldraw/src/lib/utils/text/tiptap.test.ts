import { renderHtmlFromRichTextWithExtensions, tipTapDefaultExtensions } from './richText'
import { getSchema, Mark, mergeAttributes, TaskItem, TaskList } from './tiptap'

describe('re-exported TipTap surface', () => {
	it('builds a schema from tldraw defaults plus a mark made with the re-exported Mark', () => {
		// ProseMirror throws when a schema mixes nodes from two copies of itself.
		const Wavy = Mark.create({
			name: 'wavy',
			parseHTML: () => [{ tag: 'span.wavy' }],
			renderHTML: ({ HTMLAttributes }) => [
				'span',
				mergeAttributes({ class: 'wavy' }, HTMLAttributes),
				0,
			],
		})

		const extensions = [...tipTapDefaultExtensions, Wavy]
		expect(getSchema(extensions).marks.wavy).toBeTruthy()
		expect(
			renderHtmlFromRichTextWithExtensions(
				{
					type: 'doc',
					content: [
						{
							type: 'paragraph',
							content: [{ type: 'text', marks: [{ type: 'wavy' }], text: 'hi' }],
						},
					],
				},
				extensions
			)
		).toBe('<p dir="auto"><span class="wavy">hi</span></p>')
	})

	it('adds task lists to tldraw defaults', () => {
		const schema = getSchema([...tipTapDefaultExtensions, TaskList, TaskItem])
		expect(schema.nodes.taskList).toBeTruthy()
		expect(schema.nodes.taskItem).toBeTruthy()
	})
})
