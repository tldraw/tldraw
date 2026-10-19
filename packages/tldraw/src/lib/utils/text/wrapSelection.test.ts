import { Editor as TextEditor, Extensions } from '@tiptap/core'
import { getTipTapDefaultExtensions } from './richText'
import { defaultWrappingPairs, WrapSelectionExtension } from './wrapSelection'

// The test DOM doesn't compute font-family, which is how monospace text is detected.
function mockFontFamily(fontFamily: string) {
	vi.spyOn(window, 'getComputedStyle').mockReturnValue({ fontFamily } as CSSStyleDeclaration)
}

afterEach(() => {
	vi.restoreAllMocks()
})

// Drives the real editor rather than the plugin in isolation, so that the ordering against
// Typography's input rules — which fire on a non-empty selection too — is covered.
function typeCharacter(
	content: string,
	selection: { from: number; to: number } | 'all',
	text: string,
	{
		extensions = getTipTapDefaultExtensions(),
		fontFamily,
	}: { extensions?: Extensions; fontFamily?: string } = {}
) {
	const textEditor = new TextEditor({
		extensions,
		// Matches how RichTextArea builds the editor.
		enableCoreExtensions: { textDirection: false },
		content,
	})
	if (fontFamily) mockFontFamily(fontFamily)

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

	it('wraps in the whole pair when the closing character is typed', () => {
		// `¡` and `¿` are out of reach on most layouts, so `!` and `?` have to wrap too.
		expect(typeCharacter('<p>hello</p>', selectHello, '!').html).toBe('<p dir="auto">¡hello!</p>')
		expect(typeCharacter('<p>hello</p>', selectHello, '?').html).toBe('<p dir="auto">¿hello?</p>')
		expect(typeCharacter('<p>hello</p>', selectHello, ')').html).toBe('<p dir="auto">(hello)</p>')
		expect(typeCharacter('<p>hello</p>', selectHello, '»').html).toBe('<p dir="auto">«hello»</p>')
	})

	it('picks the first pair when two are closed by the same character', () => {
		// `”` closes both `“ ”` and the Polish `„ ”`.
		expect(typeCharacter('<p>hello</p>', selectHello, '”').html).toBe('<p dir="auto">“hello”</p>')
		expect(typeCharacter('<p>hello</p>', selectHello, '’').html).toBe('<p dir="auto">‘hello’</p>')
	})

	it('replaces the selection as usual for a character in no pair', () => {
		expect(typeCharacter('<p>hello</p>', selectHello, 'a').html).toBe('<p dir="auto">a</p>')
		expect(typeCharacter('<p>hello</p>', selectHello, '@').html).toBe('<p dir="auto">@</p>')
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

	it('wraps code in straight quotes, since characters in code are literal', () => {
		expect(typeCharacter('<p><code>hello</code></p>', selectHello, '"').html).toBe(
			'<p dir="auto"><code>"hello"</code></p>'
		)
		expect(typeCharacter('<p><code>hello</code></p>', selectHello, "'").html).toBe(
			'<p dir="auto"><code>\'hello\'</code></p>'
		)
		expect(typeCharacter('<p><code>hello</code></p>', selectHello, '(').html).toBe(
			'<p dir="auto"><code>(hello)</code></p>'
		)
	})

	it('wraps monospace text in straight quotes', () => {
		const mono = { fontFamily: "'tldraw_mono', monospace" }
		expect(typeCharacter('<p>hello</p>', selectHello, '"', mono).html).toBe(
			'<p dir="auto">"hello"</p>'
		)
		expect(typeCharacter('<p>hello</p>', selectHello, '(', mono).html).toBe(
			'<p dir="auto">(hello)</p>'
		)
	})

	it('marks the selection as code when a backtick is typed', () => {
		expect(typeCharacter('<p>hello world</p>', selectHello, '`')).toEqual({
			html: '<p dir="auto"><code>hello</code> world</p>',
			selectedText: 'hello',
			htmlAfterUndo: '<p dir="auto">hello world</p>',
		})
		// Code is all-or-nothing on a selection running from plain text into code.
		expect(typeCharacter('<p>say <code>hello</code></p>', { from: 1, to: 8 }, '`').html).toBe(
			'<p dir="auto"><code>say hello</code></p>'
		)
	})

	it('turns code back into plain text when a backtick is typed over it', () => {
		expect(typeCharacter('<p><code>hello</code></p>', selectHello, '`').html).toBe(
			'<p dir="auto">hello</p>'
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
		expect(typeCharacter('<p>hello</p>', selectHello, '"', { extensions }).html).toBe(
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

describe('LiteralTypingExtension', () => {
	function typeText(content: string, at: number, text: string, fontFamily?: string) {
		const textEditor = new TextEditor({
			extensions: getTipTapDefaultExtensions(),
			enableCoreExtensions: { textDirection: false },
			content,
		})
		if (fontFamily) mockFontFamily(fontFamily)
		try {
			textEditor.commands.setTextSelection(at)
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

	it('keeps typed punctuation literal until the closing backtick makes it code', () => {
		expect(typeText('<p></p>', 1, '`say "hi"`')).toBe('<p dir="auto"><code>say "hi"</code></p>')
		expect(typeText('<p></p>', 1, "`...args -> it's`")).toBe(
			'<p dir="auto"><code>...args -&gt; it\'s</code></p>'
		)
	})

	it('goes back to typography once the span is closed', () => {
		expect(typeText('<p></p>', 1, '`x` "hi"')).toBe('<p dir="auto"><code>x</code> “hi”</p>')
	})

	it('does not count a backtick inside existing code as opening a span', () => {
		expect(typeText('<p><code>a`b</code> say</p>', 8, ' "hi"')).toBe(
			'<p dir="auto"><code>a`b</code> say “hi”</p>'
		)
	})

	it('keeps quotes straight in monospace text, but still applies the other rules', () => {
		expect(typeText('<p></p>', 1, `"it's" -- ok`, "'tldraw_mono', monospace")).toBe(
			`<p dir="auto">"it's" — ok</p>`
		)
		expect(typeText('<p></p>', 1, '"hi"', "'tldraw_draw', sans-serif")).toBe(
			'<p dir="auto">“hi”</p>'
		)
	})

	it('keeps quotes typed into existing code straight', () => {
		expect(typeText('<p><code>hi</code></p>', 2, '"')).toBe('<p dir="auto"><code>h"i</code></p>')
	})
})
