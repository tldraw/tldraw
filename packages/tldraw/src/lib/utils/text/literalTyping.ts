import { Extension } from '@tiptap/core'
import { ResolvedPos } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'

export function isStraightQuote(text: string) {
	return text === '"' || text === "'"
}

/**
 * Whether the text is set in a monospace font, like a text shape with the mono font. The TipTap
 * editor has no link back to the shape's props, so this goes by the generic `monospace` family
 * that tldraw's mono font, and any sensible replacement for it, falls back to.
 */
export function isMonospace(view: EditorView) {
	const fontFamily = view.dom.ownerDocument.defaultView?.getComputedStyle(view.dom).fontFamily
	return !!fontFamily && /\bmonospace\b/.test(fontFamily)
}

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
 * Types characters as themselves where Typography's rewrites would be wrong:
 *
 * - Between an opening backtick and the closing one that makes the text code. TipTap already skips
 *   input rules inside code, but until the closing backtick is typed the text isn't code yet:
 *   `` `say "hi"` `` would otherwise become code holding curly quotes, and `...` in `` `...args` ``
 *   an ellipsis.
 * - Quotes in monospace text, where curly quotes look out of place. The other rewrites stay on.
 */
export const LiteralTypingExtension = Extension.create({
	name: 'literalTyping',

	// Above Typography, so this gets the input first. The backtick itself is passed through, since
	// the code mark's own input rule is what closes the span.
	priority: 200,

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('literalTyping'),
				props: {
					handleTextInput(view, from, to, text) {
						if (view.composing || text.includes('`')) return false
						const isLiteral =
							(!!view.state.schema.marks.code && isInOpenCodeSpan(view.state.doc.resolve(from))) ||
							(isStraightQuote(text) && isMonospace(view))
						if (!isLiteral) return false
						view.dispatch(view.state.tr.insertText(text, from, to))
						return true
					},
				},
			}),
		]
	},
})
