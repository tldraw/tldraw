import { Extension } from '@tiptap/core'
import { ResolvedPos } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * Whether the cursor sits after an unmatched backtick, in text the closing backtick will turn into
 * code. Backticks inside existing code are literal characters, not delimiters, so they don't count.
 */
function isInOpenCodeSpan($pos: ResolvedPos) {
	let backticks = 0
	$pos.parent.nodesBetween(0, $pos.parentOffset, (node, pos) => {
		if (!node.isText || node.marks.some((mark) => mark.type.spec.code)) return
		const text = node.text!.slice(0, Math.max(0, $pos.parentOffset - pos))
		for (const char of text) if (char === '`') backticks++
	})
	return backticks % 2 === 1
}

/**
 * Types characters literally between an opening backtick and the closing one that makes them code.
 * TipTap already skips input rules inside code, but until the closing backtick is typed the text
 * isn't code yet: `` `say "hi"` `` would otherwise become code holding curly quotes, and `...` in
 * `` `...args` `` an ellipsis.
 */
export const LiteralCodeSpanExtension = Extension.create({
	name: 'literalCodeSpan',

	// Above Typography, so this gets the input first. The backtick itself is passed through, since
	// the code mark's own input rule is what closes the span.
	priority: 200,

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('literalCodeSpan'),
				props: {
					handleTextInput(view, from, to, text) {
						if (view.composing || text.includes('`')) return false
						if (!view.state.schema.marks.code) return false
						if (!isInOpenCodeSpan(view.state.doc.resolve(from))) return false
						view.dispatch(view.state.tr.insertText(text, from, to))
						return true
					},
				},
			}),
		]
	},
})
