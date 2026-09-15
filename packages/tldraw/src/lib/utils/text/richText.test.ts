import { Editor as TextEditor, Extensions, JSONContent } from '@tiptap/core'
import { Editor, TLRichText, toRichText } from '@tldraw/editor'
import {
	isEditingRichTextList,
	isEmptyRichText,
	renderHtmlFromRichTextWithExtensions,
	tipTapDefaultExtensions,
} from './richText'

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

	it('renders a task item as a labelled checkbox next to its content', () => {
		// The static render has no ProseMirror node view behind it, so this markup is what the
		// checkbox CSS in editor.css has to hang off.
		expect(
			render([
				{
					type: 'taskList',
					content: [
						{
							type: 'taskItem',
							attrs: { checked: true },
							content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ship it' }] }],
						},
					],
				},
			])
		).toBe(
			'<ul dir="auto" data-type="taskList">' +
				'<li dir="auto" data-checked="true" data-type="taskItem">' +
				'<label><input type="checkbox" checked="checked"><span></span></label>' +
				'<div><p dir="auto">ship it</p></div>' +
				'</li></ul>'
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
		// Task lists are in here because TaskItem binds Tab itself. Without this, our Tab handler
		// runs alongside it and one keypress both indents the text and nests the item.
		for (const [list, item] of [
			['bulletList', 'listItem'],
			['orderedList', 'listItem'],
			['taskList', 'taskItem'],
		]) {
			const editor = editingWith(tipTapDefaultExtensions, {
				type: 'doc',
				content: [listItem(list, item)],
			})
			expect(isEditingRichTextList(editor)).toBe(true)
		}
	})
})

describe('TaskItemToggleExtension', () => {
	const task = (text: string, checked: boolean, nested?: JSONContent): JSONContent => ({
		type: 'taskItem',
		attrs: { checked },
		content: [
			{ type: 'paragraph', content: [{ type: 'text', text }] },
			...(nested ? [{ type: 'taskList', content: [nested] }] : []),
		],
	})

	// doc > taskList > [ parent > taskList > [ child ], sibling ]
	const doc = (): JSONContent => ({
		type: 'doc',
		content: [
			{
				type: 'taskList',
				content: [task('parent', false, task('child', false)), task('sibling', false)],
			},
		],
	})

	const checkedStates = (textEditor: TextEditor) => {
		const states: [string, boolean][] = []
		textEditor.state.doc.descendants((node) => {
			if (node.type.name === 'taskItem') {
				states.push([node.firstChild!.textContent, node.attrs.checked])
			}
			return true
		})
		return states
	}

	// A cursor position just inside the textblock whose content is exactly `text`.
	const posIn = (textEditor: TextEditor, text: string) => {
		let found = -1
		textEditor.state.doc.descendants((node, pos) => {
			if (found === -1 && node.isTextblock && node.textContent === text) found = pos + 1
			return found === -1
		})
		return found
	}

	const toggleAt = (textEditor: TextEditor, from: number, to = from) => {
		textEditor.commands.setTextSelection({ from, to })
		textEditor.commands.keyboardShortcut('Mod-Enter')
	}

	it('toggles only the innermost item the cursor sits in', () => {
		// A cursor in a nested item is also "between" its parent item, which must not tick too.
		const textEditor = new TextEditor({ extensions: tipTapDefaultExtensions, content: doc() })
		toggleAt(textEditor, posIn(textEditor, 'child'))
		expect(checkedStates(textEditor)).toEqual([
			['parent', false],
			['child', true],
			['sibling', false],
		])
	})

	it('toggles back on a second press', () => {
		const textEditor = new TextEditor({ extensions: tipTapDefaultExtensions, content: doc() })
		const pos = posIn(textEditor, 'sibling')
		toggleAt(textEditor, pos)
		expect(checkedStates(textEditor)).toContainEqual(['sibling', true])
		toggleAt(textEditor, posIn(textEditor, 'sibling'))
		expect(checkedStates(textEditor)).toContainEqual(['sibling', false])
	})

	it('takes every item in the selection to the first one’s new state', () => {
		// Otherwise one press would invert each item separately rather than reading as one toggle.
		const textEditor = new TextEditor({ extensions: tipTapDefaultExtensions, content: doc() })
		toggleAt(textEditor, posIn(textEditor, 'child'))
		toggleAt(textEditor, 1, textEditor.state.doc.content.size - 1)
		expect(checkedStates(textEditor)).toEqual([
			['parent', true],
			['child', true],
			['sibling', true],
		])
	})

	it('ticks nothing when the cursor is outside every task item', () => {
		// The extension has to decline here rather than reach for the nearest item: tldraw's
		// shape-level handlers own Cmd+Enter outside a task list, finishing the edit or adding the
		// next note.
		const withParagraph = doc()
		withParagraph.content!.unshift(toRichText('intro').content[0] as JSONContent)
		const textEditor = new TextEditor({
			extensions: tipTapDefaultExtensions,
			content: withParagraph,
		})
		toggleAt(textEditor, posIn(textEditor, 'intro'))
		expect(checkedStates(textEditor)).toEqual([
			['parent', false],
			['child', false],
			['sibling', false],
		])
	})
})
