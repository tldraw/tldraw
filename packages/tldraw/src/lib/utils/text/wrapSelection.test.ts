import { Editor as TextEditor, Extensions } from '@tiptap/core'
import { getTipTapDefaultExtensions } from './richText'
import { defaultWrappingPairs, WrapSelectionExtension } from './wrapSelection'

// Drives the real editor rather than the plugin in isolation, so that the ordering against
// Typography's input rules — which fire on a non-empty selection too — is covered.
function typeCharacter(
	content: string,
	selection: { from: number; to: number } | 'all',
	text: string,
	extensions: Extensions = getTipTapDefaultExtensions()
) {
	const textEditor = new TextEditor({
		extensions,
		// Matches how RichTextArea builds the editor.
		enableCoreExtensions: { textDirection: false },
		content,
	})

	try {
		if (selection === 'all') {
			textEditor.commands.selectAll()
		} else {
			textEditor.commands.setTextSelection(selection)
		}
		const { from, to } = textEditor.state.selection
		const replaceSelection = () => textEditor.state.tr.insertText(text, from, to)
		const handled = textEditor.view.someProp('handleTextInput', (handler) =>
			handler(textEditor.view, from, to, text, replaceSelection)
		)
		if (!handled) {
			textEditor.view.dispatch(replaceSelection())
		}
		const html = textEditor.getHTML()
		const selectedText = textEditor.state.doc.textBetween(
			textEditor.state.selection.from,
			textEditor.state.selection.to
		)
		textEditor.commands.undo()
		return { html, selectedText, htmlAfterUndo: textEditor.getHTML() }
	} finally {
		textEditor.destroy()
	}
}

const selectHello = { from: 1, to: 6 }

describe('WrapSelectionExtension', () => {
	it('wraps the selection in a symmetrical pair', () => {
		expect(typeCharacter('<p>hello</p>', selectHello, '(').html).toBe('<p dir="auto">(hello)</p>')
		expect(typeCharacter('<p>hello</p>', selectHello, '«').html).toBe('<p dir="auto">«hello»</p>')
	})

	it('wraps the selection in a pair that opens and closes differently', () => {
		expect(typeCharacter('<p>hello</p>', selectHello, '¡').html).toBe('<p dir="auto">¡hello!</p>')
		expect(typeCharacter('<p>hello</p>', selectHello, '¿').html).toBe('<p dir="auto">¿hello?</p>')
	})

	it('wraps a straight quote in curly quotes, matching what Typography does to a typed one', () => {
		expect(typeCharacter('<p>hello</p>', selectHello, '"').html).toBe('<p dir="auto">“hello”</p>')
		expect(typeCharacter('<p>hello</p>', selectHello, "'").html).toBe('<p dir="auto">‘hello’</p>')
	})

	it('wraps only the selected part of a paragraph', () => {
		expect(typeCharacter('<p>hello world</p>', { from: 7, to: 12 }, '“').html).toBe(
			'<p dir="auto">hello “world”</p>'
		)
	})

	it('keeps the original text selected so wraps can be stacked', () => {
		const { selectedText } = typeCharacter('<p>hello</p>', selectHello, '(')
		expect(selectedText).toBe('hello')
	})

	it('replaces the selection as usual for a character with no pair', () => {
		expect(typeCharacter('<p>hello</p>', selectHello, 'a').html).toBe('<p dir="auto">a</p>')
		expect(typeCharacter('<p>hello</p>', selectHello, ')').html).toBe('<p dir="auto">)</p>')
	})

	it('types the character as itself when nothing is selected', () => {
		expect(typeCharacter('<p>hello</p>', { from: 6, to: 6 }, '(').html).toBe(
			'<p dir="auto">hello(</p>'
		)
	})

	it('gives the delimiters the marks that run the length of the selection', () => {
		expect(typeCharacter('<p><strong>hello</strong></p>', selectHello, '(').html).toBe(
			'<p dir="auto"><strong>(hello)</strong></p>'
		)
		// `world` is plain, so its brackets are too, even though bold text precedes it.
		expect(
			typeCharacter('<p><strong>hello </strong>world</p>', { from: 7, to: 12 }, '(').html
		).toBe('<p dir="auto"><strong>hello </strong>(world)</p>')
		// A selection that starts bold and ends plain gets plain brackets, not a stray bold one.
		expect(
			typeCharacter('<p><strong>hello</strong> world</p>', { from: 1, to: 12 }, '(').html
		).toBe('<p dir="auto">(<strong>hello</strong> world)</p>')
	})

	it('does not carry a link mark out to a delimiter beyond the link', () => {
		expect(
			typeCharacter('<p><a href="https://example.com">link</a> tail</p>', { from: 1, to: 10 }, '(')
				.html
		).toBe(
			'<p dir="auto">(<a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">link</a> tail)</p>'
		)
	})

	it('wraps a select-all the way drag-selecting the same text does', () => {
		expect(typeCharacter('<p>hello</p>', 'all', '(').html).toBe('<p dir="auto">(hello)</p>')
		expect(typeCharacter('<p>hello</p><p>world</p>', 'all', '(').html).toBe(
			'<p dir="auto">(hello</p><p dir="auto">world)</p>'
		)
	})

	it('replaces rather than wraps when the character retypes the selection itself', () => {
		// The browser leaves the DOM alone here, and prosemirror-view reports the input as the
		// selected text, so without a guard the `(` would wrap itself into `(()`.
		expect(typeCharacter('<p>(</p>', { from: 1, to: 2 }, '(').html).toBe('<p dir="auto">(</p>')
	})

	it('replaces when the selection runs from plain text into code', () => {
		expect(typeCharacter('<p>say <code>hello</code></p>', { from: 1, to: 8 }, '(').html).toBe(
			'<p dir="auto">(<code>lo</code></p>'
		)
	})

	it('replaces when the selection holds nothing but a block boundary', () => {
		expect(typeCharacter('<p>a</p><p>b</p>', { from: 2, to: 4 }, '(').html).toBe(
			'<p dir="auto">a(b</p>'
		)
	})

	it('replaces the selection inside code, where characters are literal', () => {
		expect(typeCharacter('<p><code>hello</code></p>', selectHello, '"').html).toBe(
			'<p dir="auto"><code>"</code></p>'
		)
	})

	it('wraps in one undo step', () => {
		expect(typeCharacter('<p>hello</p>', selectHello, '(').htmlAfterUndo).toBe(
			'<p dir="auto">hello</p>'
		)
	})

	it('takes its pairs from the extension options', () => {
		const extensions = [
			...getTipTapDefaultExtensions().filter((e) => e.name !== 'wrapSelection'),
			WrapSelectionExtension.configure({
				pairs: { ...defaultWrappingPairs, '"': ['"', '"'] },
			}),
		]
		expect(typeCharacter('<p>hello</p>', selectHello, '"', extensions).html).toBe(
			'<p dir="auto">"hello"</p>'
		)
	})

	it('wraps text selected across paragraphs', () => {
		expect(typeCharacter('<p>hello</p><p>world</p>', { from: 1, to: 13 }, '(').html).toBe(
			'<p dir="auto">(hello</p><p dir="auto">world)</p>'
		)
	})
})

describe('Typography', () => {
	it('converts a typed straight quote into a curly one', () => {
		expect(typeCharacter('<p></p>', { from: 1, to: 1 }, '"').html).toBe('<p dir="auto">“</p>')
	})
})
