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

	it('re-exports the same TaskList and TaskItem the defaults are built from', () => {
		// Re-adding them shouldn't fork the schema: two copies of a node under one name throws.
		const schema = getSchema([...tipTapDefaultExtensions, TaskList, TaskItem])
		expect(schema.nodes.taskList).toBeTruthy()
		expect(schema.nodes.taskItem).toBeTruthy()
	})
})
