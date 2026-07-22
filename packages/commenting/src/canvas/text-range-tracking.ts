import { Editor, TLRichText, TLShape, TLShapeId } from 'tldraw'
import { getCommentThreads, putCommentRecords, TLCommentRecord } from './comment-store'
import { commitCommentMutation, pendingComment } from './state'

/**
 * The plaintext of a shape's rich text: every text node concatenated, with nothing between blocks.
 *
 * Deliberately not `renderPlaintextFromRichText` from `tldraw`, which separates blocks with `\n`.
 * `text-range` offsets are produced from tiptap's `doc.textBetween(0, pos)` and measured by walking
 * the rendered text nodes, and neither of those contributes anything per block — using a separator
 * here would put every anchor out by one character per paragraph.
 *
 * @public
 */
export function getShapePlaintext(richText: TLRichText): string {
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

/**
 * A single replaced span: `[start, oldEnd)` in the old text became `[start, newEnd)` in the new.
 * @public
 */
export interface TextEdit {
	start: number
	oldEnd: number
	newEnd: number
}

/**
 * Describe an edit as one replaced span, by trimming the text the two versions share.
 *
 * Which end is trimmed first matters, because an edit is often ambiguous: typing `c` before
 * `comment` produces `ccomment`, and nothing in the two strings says which of the two `c`s is the
 * new one. Trimming the prefix first attributes the insertion as late as it could legally be;
 * trimming the suffix first attributes it as early as it could be. Callers use whichever bound is
 * conservative for the boundary they're moving — see {@link mapTextRange}.
 *
 * A single contiguous change is described exactly. An edit that changes several places at once (a
 * find-and-replace-all, say) collapses into one span covering all of them, which is safe — ranges
 * outside it still shift correctly — but coarse.
 *
 * Returns null when the texts are identical.
 *
 * @public
 */
export function diffText(
	oldText: string,
	newText: string,
	attribute: 'earliest' | 'latest' = 'latest'
): TextEdit | null {
	if (oldText === newText) return null

	const matchPrefix = (limit: number) => {
		let start = 0
		while (start < limit && oldText[start] === newText[start]) start++
		return start
	}
	const matchSuffix = (limit: number) => {
		let suffix = 0
		while (
			suffix < limit &&
			oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
		) {
			suffix++
		}
		return suffix
	}

	// Whichever end is matched first gets to be greedy; the second is capped so the two can't
	// overlap and produce a span that runs backwards.
	if (attribute === 'latest') {
		const start = matchPrefix(Math.min(oldText.length, newText.length))
		const suffix = matchSuffix(Math.min(oldText.length - start, newText.length - start))
		return { start, oldEnd: oldText.length - suffix, newEnd: newText.length - suffix }
	}

	const suffix = matchSuffix(Math.min(oldText.length, newText.length))
	const start = matchPrefix(Math.min(oldText.length - suffix, newText.length - suffix))
	return { start, oldEnd: oldText.length - suffix, newEnd: newText.length - suffix }
}

/**
 * Move one character offset across an edit. Offsets before the edit are unchanged and offsets after
 * it shift by its change in length; the only real decision is what to do with one that lands inside
 * the replaced span, and `bias` says which end of a range it came from.
 *
 * Both biases point outwards at the span's edges and inwards within it, so text inserted right at a
 * boundary stays outside the range while text inserted inside joins it, and a boundary whose
 * characters were rewritten collapses towards the middle. Collapsing inwards is what keeps this safe
 * under repeated edits: a boundary never jumps outwards over text the range didn't cover, so no
 * sequence of edits — a select-all retype and its undo, say — can balloon a comment out over a
 * passage nobody commented on.
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

/**
 * Move a `[from, to)` character range across a text change, so a range anchored to some words still
 * covers those words afterwards.
 *
 * An ambiguous edit has two legal readings (see {@link diffText}), and they don't agree on where the
 * range ends up. Rather than guess, this maps the range through both and keeps the overlap. The
 * result is never wider than either reading, so an ambiguous edit always resolves away from the
 * comment: typing `c` against the front of a comment on `comment button` leaves it on
 * `comment button` rather than stretching it over `ccomment button`.
 *
 * @public
 */
export function mapTextRange(
	range: { from: number; to: number },
	oldText: string,
	newText: string
): { from: number; to: number } {
	const readings = [
		diffText(oldText, newText, 'earliest'),
		diffText(oldText, newText, 'latest'),
	].filter((edit): edit is TextEdit => edit !== null)
	if (readings.length === 0) return range

	const from = Math.max(...readings.map((edit) => mapOffset(range.from, edit, 'start')))
	const to = Math.min(...readings.map((edit) => mapOffset(range.to, edit, 'end')))
	// The boundaries cross when the edit swallowed the range whole, or when the two readings don't
	// overlap at all. Either way nothing the range covered definitely survived, so it collapses to a
	// point instead of spanning text it may never have covered.
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
 * A `text-range` anchor stores plaintext character offsets, so without this any edit before or
 * inside the range leaves it pointing at the wrong characters. This watches shape changes for a
 * change to the rich text and maps every affected anchor across it, including the draft range of an
 * open composer.
 *
 * Working from the shape record rather than from tiptap means this covers undo, redo and
 * programmatic `updateShapes` calls, not just text typed into the editor.
 *
 * Two things to know before using this in a synced app. Anchor writes go through
 * {@link commitCommentMutation}, so by default they don't land on the undo stack — undoing an edit
 * that collapsed an anchor restores the text but not the anchor. And every client running this
 * converges on the same offsets but writes the same record N times; worse, comment records ride a
 * different sync lane than the document, so a client that sees a peer's already-remapped anchor
 * before that peer's shape change will map it a second time. Prefer remapping in one place — on the
 * server, or only on the client that made the edit.
 *
 * Returns a function that stops tracking.
 *
 * @public
 */
export function trackTextRangeAnchors(editor: Editor): () => void {
	return editor.sideEffects.registerAfterChangeHandler('shape', (prev, next) => {
		const prevRichText = getRichText(prev)
		const nextRichText = getRichText(next)
		// This runs on every shape change, so bail on the identical reference a move or resize leaves
		// behind before walking the document twice to build its plaintext.
		if (!prevRichText || !nextRichText || prevRichText === nextRichText) return

		const oldText = getShapePlaintext(prevRichText)
		const newText = getShapePlaintext(nextRichText)
		if (oldText === newText) return

		remapPendingComment(editor, next.id, oldText, newText)

		const updated: TLCommentRecord[] = []
		for (const thread of getCommentThreads(editor)) {
			const { anchor } = thread
			if (anchor.type !== 'text-range' || anchor.shapeId !== next.id) continue
			const mapped = mapTextRange(anchor, oldText, newText)
			if (mapped.from === anchor.from && mapped.to === anchor.to) continue
			updated.push({ ...thread, anchor: { ...anchor, ...mapped } })
		}

		if (updated.length === 0) return
		commitCommentMutation(editor, () => putCommentRecords(editor, updated))
	})
}

/** A draft range in the open composer needs the same treatment as a committed one. */
function remapPendingComment(
	editor: Editor,
	shapeId: TLShapeId,
	oldText: string,
	newText: string
): void {
	const pending = pendingComment.get(editor)
	if (pending?.anchor.type !== 'text-range' || pending.anchor.shapeId !== shapeId) return
	const mapped = mapTextRange(pending.anchor, oldText, newText)
	if (mapped.from === pending.anchor.from && mapped.to === pending.anchor.to) return
	pendingComment.set(editor, { ...pending, anchor: { ...pending.anchor, ...mapped } })
}
