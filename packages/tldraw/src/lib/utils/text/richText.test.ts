import { Extensions, Node } from '@tiptap/core'
import { TLRichText, toRichText } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import {
	isEmptyRichText,
	renderHtmlFromRichTextWithExtensions,
	renderPlaintextFromRichText,
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
	const editors: TestEditor[] = []
	function makeEditor(extensions?: Extensions) {
		const editor = new TestEditor(
			extensions ? { options: { text: { tipTapConfig: { extensions } } } } : {}
		)
		editors.push(editor)
		return editor
	}
	afterEach(() => {
		for (const editor of editors.splice(0)) editor.dispose()
	})

	// A minimal custom inline node with a renderText serializer, the way mention/emoji
	// extensions define one.
	const Mention = Node.create({
		name: 'mention',
		group: 'inline',
		inline: true,
		atom: true,
		addAttributes() {
			return { label: { default: '' } }
		},
		renderText({ node }) {
			return `@${node.attrs.label}`
		},
		renderHTML() {
			return ['span']
		},
	})

	const paragraph = (text: string): TLRichText['content'][number] => ({
		type: 'paragraph',
		content: text === '' ? [] : [{ type: 'text', text }],
	})
	const doc = (...content: TLRichText['content']): TLRichText => ({ type: 'doc', content })

	it('renders default content one line per textblock', () => {
		const editor = makeEditor()
		expect(renderPlaintextFromRichText(editor, doc(paragraph('one'), paragraph('two')))).toBe(
			'one\ntwo'
		)
		expect(
			renderPlaintextFromRichText(
				editor,
				doc({
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'a' },
						{ type: 'hardBreak' },
						{ type: 'text', text: 'b' },
					],
				})
			)
		).toBe('a\nb')
		expect(
			renderPlaintextFromRichText(
				editor,
				doc({
					type: 'bulletList',
					content: [
						{ type: 'listItem', content: [paragraph('first')] },
						{ type: 'listItem', content: [paragraph('second')] },
					],
				})
			)
		).toBe('first\nsecond')
		expect(
			renderPlaintextFromRichText(
				editor,
				doc({ type: 'codeBlock', content: [{ type: 'text', text: 'const a = 1' }] })
			)
		).toBe('const a = 1')
	})

	it('honors custom node renderText serializers, like generateText did', () => {
		const editor = makeEditor([...tipTapDefaultExtensions, Mention])
		const rt = doc({
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'hello ' },
				{ type: 'mention', attrs: { label: 'Steve' } },
			],
		})
		expect(renderPlaintextFromRichText(editor, rt)).toBe('hello @Steve')
	})

	it('caches per editor when custom serializers exist', () => {
		// The same rich text object must not leak one editor's serialization to another —
		// output depends on each editor's extensions.
		const rt = doc({
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'hello ' },
				{ type: 'mention', attrs: { label: 'Steve' } },
			],
		})
		const withMention = makeEditor([...tipTapDefaultExtensions, Mention])
		const plain = makeEditor()
		expect(renderPlaintextFromRichText(withMention, rt)).toBe('hello @Steve')
		expect(renderPlaintextFromRichText(plain, rt)).toBe('hello ')
	})
})
