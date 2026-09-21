import { Editor as TextEditor, Extensions, JSONContent } from '@tiptap/core'
import { Editor, TLRichText, toRichText } from '@tldraw/editor'
import {
	isEditingRichTextList,
	isEditingRichTextTaskItem,
	isEmptyRichText,
	renderHtmlFromRichTextWithExtensions,
	TaskItemToggleExtension,
	tipTapDefaultExtensions,
	toggleTaskItemInRichText,
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

describe('isEditingRichTextTaskItem', () => {
	const editingWith = (extensions: Extensions, content: JSONContent) => {
		const textEditor = new TextEditor({ extensions, content })
		return { getRichTextEditor: () => textEditor } as unknown as Editor
	}

	const taskDoc: JSONContent = {
		type: 'doc',
		content: [
			{
				type: 'taskList',
				content: [
					{
						type: 'taskItem',
						attrs: { checked: false },
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }],
					},
				],
			},
		],
	}

	it('is true in a task item with the defaults', () => {
		expect(isEditingRichTextTaskItem(editingWith(tipTapDefaultExtensions, taskDoc))).toBe(true)
	})

	it('is false in a plain paragraph', () => {
		const editor = editingWith(tipTapDefaultExtensions, toRichText('a') as JSONContent)
		expect(isEditingRichTextTaskItem(editor)).toBe(false)
	})

	it('is false when the toggle extension has been filtered out', () => {
		// Otherwise the shape handlers stand down for a keymap that isn't installed, and Cmd+Enter
		// neither ticks the item nor does what it used to.
		const withoutToggle = tipTapDefaultExtensions.filter(
			(extension) => extension.name !== TaskItemToggleExtension.name
		)
		expect(isEditingRichTextTaskItem(editingWith(withoutToggle, taskDoc))).toBe(false)
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

describe('task item shortcut', () => {
	function typeText(content: string, text: string) {
		const textEditor = new TextEditor({
			extensions: tipTapDefaultExtensions,
			enableCoreExtensions: { textDirection: false },
			content,
		})
		try {
			textEditor.commands.focus('end')
			for (const char of text) {
				const { from, to } = textEditor.state.selection
				const insert = () => textEditor.state.tr.insertText(char, from, to)
				const handled = textEditor.view.someProp('handleTextInput', (handler) =>
					handler(textEditor.view, from, to, char, insert)
				)
				if (!handled) textEditor.view.dispatch(insert())
			}
			return textEditor.getHTML()
		} finally {
			textEditor.destroy()
		}
	}

	const taskList = (...items: [checked: boolean, text: string][]) =>
		'<ul dir="auto" data-type="taskList">' +
		items
			.map(
				([checked, text]) =>
					`<li dir="auto" data-checked="${checked}" data-type="taskItem">` +
					`<label><input type="checkbox"${checked ? ' checked="checked"' : ''}><span></span></label>` +
					`<div><p dir="auto">${text}</p></div></li>`
			)
			.join('') +
		'</ul>'

	it.each(['[ ] a', '[] a', '-[ ] a', '-[] a', '- [ ] a', '- [] a'])(
		'turns `%s` into an unchecked task',
		(typed) => {
			expect(typeText('<p></p>', typed)).toBe(taskList([false, 'a']))
		}
	)

	it.each(['[x] a', '[X] a', '-[x] a', '- [x] a'])('turns `%s` into a checked task', (typed) => {
		expect(typeText('<p></p>', typed)).toBe(taskList([true, 'a']))
	})

	it('only fires at the start of a line', () => {
		expect(typeText('<p></p>', 'b [ ] a')).toBe('<p dir="auto">b [ ] a</p>')
	})

	it('joins the task list above', () => {
		expect(typeText(taskList([true, 'a']) + '<p></p>', '[ ] b')).toBe(
			taskList([true, 'a'], [false, 'b'])
		)
	})

	it('lifts only the bulleted item it fires in out of its list', () => {
		expect(typeText('<ul><li><p>a</p></li></ul><p></p>', '- [ ] b')).toBe(
			'<ul dir="auto"><li dir="auto"><p dir="auto">a</p></li></ul>' + taskList([false, 'b'])
		)
	})

	it('leaves the brackets as typed inside a task item', () => {
		expect(typeText(taskList([false, '']), '[ ] a')).toBe(taskList([false, '[ ] a']))
	})
})

describe('toggleTaskItemInRichText', () => {
	const task = (text: string, checked: boolean, nested?: JSONContent): JSONContent => ({
		type: 'taskItem',
		attrs: { checked },
		content: [
			{ type: 'paragraph', content: [{ type: 'text', text }] },
			...(nested ? [{ type: 'taskList', content: [nested] }] : []),
		],
	})
	const doc = (parent: boolean, child: boolean, sibling: boolean) =>
		({
			type: 'doc',
			content: [
				{
					type: 'taskList',
					content: [task('parent', parent, task('child', child)), task('sibling', sibling)],
				},
			],
		}) as TLRichText

	it('counts items in document order, a parent before its children', () => {
		// The same order the rendered checkboxes come in, which is how a click finds its item.
		expect(toggleTaskItemInRichText(doc(false, false, false), 0)).toEqual(doc(true, false, false))
		expect(toggleTaskItemInRichText(doc(false, false, false), 1)).toEqual(doc(false, true, false))
		expect(toggleTaskItemInRichText(doc(false, false, true), 2)).toEqual(doc(false, false, false))
	})

	it('leaves the rich text alone for an index past the last item', () => {
		expect(toggleTaskItemInRichText(doc(false, false, false), 3)).toEqual(doc(false, false, false))
	})
})
