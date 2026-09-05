import { getSchema } from '@tiptap/core'
import { Node } from '@tiptap/pm/model'
import { TLRichText, toRichText } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import {
	isEmptyRichText,
	renderHtmlFromRichTextWithExtensions,
	renderPlaintextFromRichText,
	renderPlaintextFromRichTextRange,
	renderRichTextFromHTML,
	tipTapDefaultExtensions,
} from './richText'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

const text = (t: string) => ({ type: 'text', text: t })
const paragraph = (t: string) => ({ type: 'paragraph', content: [text(t)] })
const listItem = (...content: any[]) => ({ type: 'listItem', content })

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

describe('renderPlaintextFromRichText', () => {
	const plain = (content: TLRichText['content']) =>
		renderPlaintextFromRichText(editor, { type: 'doc', content } as TLRichText)

	it('separates paragraphs with a single newline', () => {
		expect(plain([paragraph('one'), paragraph('two')])).toBe('one\ntwo')
	})

	it('renders bullet list items as one dashed line each', () => {
		expect(
			plain([
				paragraph('Shopping'),
				{
					type: 'bulletList',
					content: [listItem(paragraph('eggs')), listItem(paragraph('milk'))],
				},
				paragraph('Done'),
			])
		).toBe('Shopping\n- eggs\n- milk\nDone')
	})

	it('numbers ordered list items from the list start', () => {
		expect(
			plain([
				{
					type: 'orderedList',
					attrs: { start: 3 },
					content: [listItem(paragraph('three')), listItem(paragraph('four'))],
				},
			])
		).toBe('3. three\n4. four')
	})

	it('indents nested lists under their parent item', () => {
		expect(
			plain([
				{
					type: 'bulletList',
					content: [
						listItem(paragraph('fruit'), {
							type: 'orderedList',
							content: [listItem(paragraph('apple')), listItem(paragraph('pear'))],
						}),
						listItem(paragraph('veg')),
					],
				},
			])
		).toBe('- fruit\n  1. apple\n  2. pear\n- veg')
	})

	it('keeps a hard break inside a list item', () => {
		expect(
			plain([
				{
					type: 'bulletList',
					content: [
						listItem({
							type: 'paragraph',
							content: [text('before'), { type: 'hardBreak' }, text('after')],
						}),
						listItem(paragraph('next')),
					],
				},
			])
		).toBe('- before\nafter\n- next')
	})

	it('keeps a hard break pasted inside a list item', () => {
		const richText = renderRichTextFromHTML(
			editor,
			'<ul><li>before<br>after</li><li>next</li></ul>'
		)
		expect(renderPlaintextFromRichText(editor, richText)).toBe('- before\nafter\n- next')
	})
})

describe('renderPlaintextFromRichTextRange', () => {
	// Positions: `Shopping` occupies 1-9, `eggs` 13-17 and `milk` 21-25.
	const doc = Node.fromJSON(getSchema(tipTapDefaultExtensions), {
		type: 'doc',
		content: [
			paragraph('Shopping'),
			{
				type: 'bulletList',
				content: [listItem(paragraph('eggs')), listItem(paragraph('milk'))],
			},
		],
	})
	const between = (from: number, to: number) => renderPlaintextFromRichTextRange(doc, { from, to })

	it('renders the whole document like renderPlaintextFromRichText', () => {
		expect(between(0, doc.content.size)).toBe('Shopping\n- eggs\n- milk')
	})

	it('cuts the first and last lines to the selection', () => {
		expect(between(5, 23)).toBe('ping\n- eggs\n- mi')
	})

	it('only marks an item when the selection starts at its beginning', () => {
		expect(between(14, 25)).toBe('ggs\n- milk')
		expect(between(13, 25)).toBe('- eggs\n- milk')
	})

	it('renders a selection inside a single item without a marker', () => {
		expect(between(22, 24)).toBe('il')
		expect(between(21, 25)).toBe('milk')
	})

	it('skips items outside the selection', () => {
		expect(between(1, 17)).toBe('Shopping\n- eggs')
	})
})

describe('renderRichTextFromHTML', () => {
	const hrefs = (html: string) => {
		const found: string[] = []
		const walk = (node: any) => {
			for (const mark of node.marks ?? []) if (mark.type === 'link') found.push(mark.attrs.href)
			for (const child of node.content ?? []) walk(child)
		}
		walk(renderRichTextFromHTML(editor, html))
		return found
	}

	it('gives a scheme-less href a scheme so it does not resolve against the host page', () => {
		expect(
			hrefs(
				'<p><a href="example.com">a</a> <a href="www.example.com?q=1">b</a> <a href="//example.com/path">c</a></p>'
			)
		).toEqual(['https://example.com', 'https://www.example.com?q=1', 'https://example.com/path'])
	})

	it('leaves hrefs that already have a scheme alone', () => {
		expect(
			hrefs(
				'<p><a href="http://example.com">a</a> <a href="https://example.com">b</a> <a href="mailto:hi@example.com">c</a></p>'
			)
		).toEqual(['http://example.com', 'https://example.com', 'mailto:hi@example.com'])
	})

	it('leaves explicitly relative hrefs alone', () => {
		expect(
			hrefs(
				'<p><a href="/docs">a</a> <a href="./docs">b</a> <a href="#top">c</a> <a href="?q=1">d</a></p>'
			)
		).toEqual(['/docs', './docs', '#top', '?q=1'])
	})
})
