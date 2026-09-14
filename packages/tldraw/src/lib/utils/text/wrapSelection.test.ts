import { Editor as TextEditor } from '@tiptap/core'
import { getTipTapDefaultExtensions } from './richText'

// Drives the real editor rather than the plugin in isolation, so that the ordering against
// Typography's input rules — which fire on a non-empty selection too — is covered.
function typeOverSelection(content: string, selection: { from: number; to: number }, text: string) {
	const textEditor = new TextEditor({
		extensions: getTipTapDefaultExtensions(),
		// As RichTextArea builds it: the core text direction extension is off because our own
		// extension list adds it back, so that consumers can override it.
		enableCoreExtensions: { textDirection: false },
		content,
	})

	try {
		textEditor.commands.setTextSelection(selection)
		const { from, to } = textEditor.state.selection
		const replaceSelection = () => textEditor.state.tr.insertText(text, from, to)
		const handled = textEditor.view.someProp('handleTextInput', (handler) =>
			handler(textEditor.view, from, to, text, replaceSelection)
		)
		if (!handled) {
			textEditor.view.dispatch(replaceSelection())
		}
		return {
			html: textEditor.getHTML(),
			selectedText: textEditor.state.doc.textBetween(
				textEditor.state.selection.from,
				textEditor.state.selection.to
			),
		}
	} finally {
		textEditor.destroy()
	}
}

const selectHello = { from: 1, to: 6 }

describe('WrapSelectionExtension', () => {
	it('wraps the selection in a symmetrical pair', () => {
		expect(typeOverSelection('<p>hello</p>', selectHello, '(').html).toBe(
			'<p dir="auto">(hello)</p>'
		)
		expect(typeOverSelection('<p>hello</p>', selectHello, '«').html).toBe(
			'<p dir="auto">«hello»</p>'
		)
	})

	it('wraps the selection in a pair that opens and closes differently', () => {
		expect(typeOverSelection('<p>hello</p>', selectHello, '¡').html).toBe(
			'<p dir="auto">¡hello!</p>'
		)
		expect(typeOverSelection('<p>hello</p>', selectHello, '¿').html).toBe(
			'<p dir="auto">¿hello?</p>'
		)
	})

	it('wraps a straight quote in curly quotes, matching what Typography does to a typed one', () => {
		expect(typeOverSelection('<p>hello</p>', selectHello, '"').html).toBe(
			'<p dir="auto">“hello”</p>'
		)
		expect(typeOverSelection('<p>hello</p>', selectHello, "'").html).toBe(
			'<p dir="auto">‘hello’</p>'
		)
	})

	it('wraps only the selected part of a paragraph', () => {
		expect(typeOverSelection('<p>hello world</p>', { from: 7, to: 12 }, '“').html).toBe(
			'<p dir="auto">hello “world”</p>'
		)
	})

	it('keeps the original text selected so wraps can be stacked', () => {
		const { selectedText } = typeOverSelection('<p>hello</p>', selectHello, '(')
		expect(selectedText).toBe('hello')
	})

	it('replaces the selection as usual for a character with no pair', () => {
		expect(typeOverSelection('<p>hello</p>', selectHello, 'a').html).toBe('<p dir="auto">a</p>')
		expect(typeOverSelection('<p>hello</p>', selectHello, ')').html).toBe('<p dir="auto">)</p>')
	})

	it('types the character as itself when nothing is selected', () => {
		expect(typeOverSelection('<p>hello</p>', { from: 6, to: 6 }, '(').html).toBe(
			'<p dir="auto">hello(</p>'
		)
	})

	it('gives the delimiters the marks that run the length of the selection', () => {
		expect(typeOverSelection('<p><strong>hello</strong></p>', selectHello, '(').html).toBe(
			'<p dir="auto"><strong>(hello)</strong></p>'
		)
		// `world` is plain, so its brackets are too, even though bold text precedes it.
		expect(
			typeOverSelection('<p><strong>hello </strong>world</p>', { from: 7, to: 12 }, '(').html
		).toBe('<p dir="auto"><strong>hello </strong>(world)</p>')
	})

	it('replaces the selection inside code, where characters are literal', () => {
		expect(typeOverSelection('<p><code>hello</code></p>', selectHello, '"').html).toBe(
			'<p dir="auto"><code>"</code></p>'
		)
	})

	it('wraps text selected across paragraphs', () => {
		expect(typeOverSelection('<p>hello</p><p>world</p>', { from: 1, to: 13 }, '(').html).toBe(
			'<p dir="auto">(hello</p><p dir="auto">world)</p>'
		)
	})
})

describe('Typography', () => {
	it('converts a typed straight quote into a curly one', () => {
		expect(typeOverSelection('<p></p>', { from: 1, to: 1 }, '"').html).toBe('<p dir="auto">“</p>')
	})

	it('converts a typed ellipsis', () => {
		expect(typeOverSelection('<p>and so..</p>', { from: 9, to: 9 }, '.').html).toBe(
			'<p dir="auto">and so…</p>'
		)
	})
})
