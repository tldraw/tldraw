import {
	commitCommentMutation,
	getCommentThreads,
	pendingComment,
	putCommentRecords,
} from '@tldraw/commenting'
import { Editor, TLCommentThread, TLRichText, TLShape, TLShapeId } from 'tldraw'

/**
 * The plaintext of a rich text document: every text node concatenated, with nothing between blocks.
 * This has to match the two other places the example turns text into offsets — tiptap's
 * `doc.textBetween(0, pos)` when a range is first commented, and the DOM text node walk the
 * highlight overlay uses to measure it — so all three agree on what character N is.
 */
export function richTextToPlaintext(richText: TLRichText): string {
	let out = ''
	const visit = (node: unknown) => {
		if (!node || typeof node !== 'object') return
		const { text, content } = node as { text?: unknown; content?: unknown }
		if (typeof text === 'string') out += text
		if (Array.isArray(content)) content.forEach(visit)
	}
	visit(richText)
	return out
}

/** A single replaced span: `[start, oldEnd)` in the old text became `[start, newEnd)` in the new. */
export interface TextEdit {
	start: number
	oldEnd: number
	newEnd: number
}

/**
 * Describe an edit as one replaced span, by trimming the common prefix and suffix of the two
 * strings. That's exact for the one contiguous change a keystroke, paste, or deletion makes. An
 * edit that changes several places at once (a find-and-replace-all, say) collapses into one span
 * covering all of them, which is safe — ranges outside it still shift correctly — but coarse.
 *
 * Returns null when the texts are identical.
 */
export function diffText(oldText: string, newText: string): TextEdit | null {
	if (oldText === newText) return null

	let start = 0
	const maxStart = Math.min(oldText.length, newText.length)
	while (start < maxStart && oldText[start] === newText[start]) start++

	let suffix = 0
	const maxSuffix = Math.min(oldText.length - start, newText.length - start)
	while (
		suffix < maxSuffix &&
		oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
	) {
		suffix++
	}

	return { start, oldEnd: oldText.length - suffix, newEnd: newText.length - suffix }
}

/**
 * Move one character offset across an edit, the way ProseMirror's position mapping does. An offset
 * before the edit is unchanged and one after it shifts by the edit's change in length; the
 * interesting cases are the ones that touch the replaced span, and they're decided by which side
 * the offset associates with:
 *
 * - Inserted text right at a boundary lands outside the range: a range's `from` associates with the
 *   text that follows it, and its `to` with the text before it, so a comment on "the button" doesn't
 *   quietly swallow words typed against either edge of it.
 * - An edit wholly inside the range leaves both boundaries outside it, so the range simply absorbs
 *   the change — type a word into a commented phrase and the comment covers it.
 * - A boundary sitting inside rewritten text has nothing left to point at, so it collapses inwards:
 *   `from` to the back of the replacement, `to` to its front. The range shrinks to whatever survived
 *   the edit, which is empty if the edit swallowed it whole. Collapsing inwards is what keeps this
 *   safe under repeated edits — a boundary can never jump outwards over text the range never
 *   covered, so no sequence of edits (a select-all retype and its undo, say) can balloon a comment
 *   out over a passage nobody commented on.
 */
function mapOffset(offset: number, edit: TextEdit, bias: 'start' | 'end'): number {
	const delta = edit.newEnd - edit.oldEnd
	if (bias === 'start') {
		if (offset < edit.start) return offset
		if (offset >= edit.oldEnd) return offset + delta
		return edit.newEnd
	}
	if (offset <= edit.start) return offset
	if (offset >= edit.oldEnd) return offset + delta
	return edit.start
}

/** Move a `[from, to)` character range across an edit. */
export function mapTextRange(
	range: { from: number; to: number },
	edit: TextEdit
): { from: number; to: number } {
	const from = mapOffset(range.from, edit, 'start')
	const to = mapOffset(range.to, edit, 'end')
	// The boundaries cross over when the edit swallowed the range whole: `from` collapsed to the back
	// of the replacement and `to` to its front. Nothing the range covered survived, so it collapses
	// to a point rather than spanning the replacement — text the comment never covered must not end
	// up inside it. The thread stays either way, its pin still on the shape.
	if (from > to) return { from: to, to }
	return { from, to }
}

/** The shape's rich text, or undefined for shapes that don't have any. */
function getRichText(shape: TLShape): TLRichText | undefined {
	const { richText } = shape.props as { richText?: TLRichText }
	return richText
}

/**
 * Keep `text-range` comment anchors pointing at the same words as the text they're attached to is
 * edited.
 *
 * A text-range anchor stores plaintext character offsets, so any edit before or inside the range
 * would otherwise leave it pointing at the wrong characters. This watches every shape change for a
 * change to its rich text, diffs the old and new plaintext into a single replaced span, and maps
 * each affected anchor's offsets across it.
 *
 * Working from the shape record rather than from tiptap means this covers every kind of edit —
 * typing, undo/redo, programmatic `updateShapes` calls, and remote collaborators' changes arriving
 * over sync — not just the ones this client types. Anchors are remapped locally on each client
 * from the same text change, so they stay consistent without any extra messages on the wire.
 *
 * Returns a function that stops tracking.
 */
export function trackTextRangeAnchors(editor: Editor): () => void {
	return editor.sideEffects.registerAfterChangeHandler('shape', (prev, next) => {
		const prevRichText = getRichText(prev)
		const nextRichText = getRichText(next)
		if (!prevRichText || !nextRichText || prevRichText === nextRichText) return

		const edit = diffText(richTextToPlaintext(prevRichText), richTextToPlaintext(nextRichText))
		if (!edit) return

		remapPendingComment(editor, next.id, edit)

		const updated: TLCommentThread[] = []
		for (const thread of getCommentThreads(editor)) {
			const { anchor } = thread
			if (anchor.type !== 'text-range' || anchor.shapeId !== next.id) continue
			const mapped = mapTextRange(anchor, edit)
			if (mapped.from === anchor.from && mapped.to === anchor.to) continue
			updated.push({ ...thread, anchor: { ...anchor, ...mapped } })
		}

		if (updated.length === 0) return
		commitCommentMutation(editor, () => putCommentRecords(editor, updated))
	})
}

/** A draft range in the open composer needs the same treatment as a committed one. */
function remapPendingComment(editor: Editor, shapeId: TLShapeId, edit: TextEdit) {
	const pending = pendingComment.get(editor)
	if (pending?.anchor.type !== 'text-range' || pending.anchor.shapeId !== shapeId) return
	const mapped = mapTextRange(pending.anchor, edit)
	if (mapped.from === pending.anchor.from && mapped.to === pending.anchor.to) return
	pendingComment.set(editor, { ...pending, anchor: { ...pending.anchor, ...mapped } })
}
