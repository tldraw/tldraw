import { Editor as TextEditor, Extensions, JSONContent } from '@tiptap/core'
import { Editor, TLRichText, toRichText } from '@tldraw/editor'
import {
	isEditingRichTextList,
	isEmptyRichText,
	renderHtmlFromRichTextWithExtensions,
	tipTapDefaultExtensions,
} from './richText'
import { TaskItem, TaskList } from './tiptap'

const render = (content: TLRichText['content']) =>
	renderHtmlFromRichTextWithExtensions(
		{ type: 'doc', content } as TLRichText,
		tipTapDefaultExtensions
	)

describe('renderHtmlFromRichTextWithExtensions', () => {
	it('fills an empty paragraph with a line break so the browser does not collapse it', () => {
		expect(render([{ type: 'paragraph' }])).toBe('<p dir="auto"><br /></p>')
	})

	it('keeps an explicit direction on an empty paragraph', () => {
		// A `dir` of `ltr`/`rtl` rather than the default `auto` comes from pasted HTML that carried
		// one, or from TipTap's `setTextDirection`. Dropping it would re-align the blank line.
		expect(render([{ type: 'paragraph', attrs: { dir: 'rtl' } }])).toBe('<p dir="rtl"><br /></p>')
		expect(render([{ type: 'paragraph', attrs: { dir: 'ltr' } }])).toBe('<p dir="ltr"><br /></p>')
	})

	it('fills a paragraph with no attributes at all', () => {
		// Extension sets without TipTap's TextDirection render a bare `<p>`.
		expect(render([{ type: 'paragraph', attrs: { dir: null } }])).toBe('<p><br /></p>')
	})

	it('leaves paragraphs with content alone', () => {
		expect(render([{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }])).toBe(
			'<p dir="auto">hello</p>'
		)
	})

	it('fills every empty paragraph, including ones nested in a list item', () => {
		expect(
			render([
				{ type: 'paragraph' },
				{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
				{ type: 'paragraph' },
				{
					type: 'bulletList',
					content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
				},
			])
		).toBe(
			'<p dir="auto"><br /></p><p dir="auto">hello</p><p dir="auto"><br /></p>' +
				'<ul dir="auto"><li dir="auto"><p dir="auto"><br /></p></li></ul>'
		)
	})
})

describe('isEmptyRichText', () => {
	it('treats a paragraph with no content key as empty (interactive editor output)', () => {
		expect(isEmptyRichText(toRichText(''))).toBe(true)
	})

	it('treats a paragraph with an empty content array as empty (programmatic authoring)', () => {
		const richText: TLRichText = {
			type: 'doc',
			content: [{ type: 'paragraph', attrs: { dir: 'auto' }, content: [] }],
		}
		expect(isEmptyRichText(richText)).toBe(true)
	})

	it('treats a doc with an empty content array as empty (hand-authored / importer form)', () => {
		const richText: TLRichText = { type: 'doc', content: [] }
		expect(isEmptyRichText(richText)).toBe(true)
	})

	it('treats a paragraph with text as non-empty', () => {
		expect(isEmptyRichText(toRichText('Hello'))).toBe(false)
	})

	it('treats multiple paragraphs as non-empty', () => {
		const richText: TLRichText = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [] },
				{ type: 'paragraph', content: [] },
			],
		}
		expect(isEmptyRichText(richText)).toBe(false)
	})
})

describe('isEditingRichTextList', () => {
	const editingWith = (extensions: Extensions, content: JSONContent) => {
		const textEditor = new TextEditor({ extensions, content })
		return { getRichTextEditor: () => textEditor } as unknown as Editor
	}

	const listItem = (type: string, itemType: string): JSONContent => ({
		type,
		content: [
			{ type: itemType, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }] },
		],
	})

	it('is false in a plain paragraph', () => {
		const editor = editingWith(tipTapDefaultExtensions, toRichText('a') as JSONContent)
		expect(isEditingRichTextList(editor)).toBe(false)
	})

	it('is true in the default lists', () => {
		for (const [list, item] of [
			['bulletList', 'listItem'],
			['orderedList', 'listItem'],
		]) {
			const editor = editingWith(tipTapDefaultExtensions, {
				type: 'doc',
				content: [listItem(list, item)],
			})
			expect(isEditingRichTextList(editor)).toBe(true)
		}
	})

	it('is true in a task list, whose items bind Tab themselves', () => {
		// Without this, our Tab handler runs alongside TaskItem's and one keypress both indents the
		// text and nests the item.
		const editor = editingWith([...tipTapDefaultExtensions, TaskList, TaskItem], {
			type: 'doc',
			content: [listItem('taskList', 'taskItem')],
		})
		expect(isEditingRichTextList(editor)).toBe(true)
	})
})
