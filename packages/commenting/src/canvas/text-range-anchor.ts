import { structuredClone } from '@tldraw/utils'
import { TLCommentAnchor, TLRichText, TLShapeId } from 'tldraw'

/** A comment anchor backed by an immutable source rich-text snapshot. @public */
export type TextRangeAnchor = Extract<TLCommentAnchor, { type: 'text-range' }>

/**
 * The result of resolving an immutable text-range anchor against a shape's current rich text.
 *
 * - `attached` means the source range has one unambiguous position in the current text.
 * - `ambiguous` means more than one edit attribution was possible; the returned range is the
 *   conservative overlap shared by those readings.
 * - `collapsed` means none of the source range can be identified in the current text.
 *
 * @public
 */
export interface ResolvedTextRange {
	from: number
	to: number
	status: 'attached' | 'ambiguous' | 'collapsed'
}

/**
 * Create an immutable text-range anchor from a shape's current rich text and a pair of plaintext
 * offsets.
 *
 * The source snapshot stays fixed for the lifetime of the thread. Consumers derive a display range
 * from it with {@link resolveTextRangeAnchor}; editing the shape never rewrites the comment record.
 *
 * @public
 */
export function createTextRangeAnchor(
	shapeId: TLShapeId,
	richText: TLRichText,
	range: { from: number; to: number }
): TextRangeAnchor {
	const textLength = getShapePlaintext(richText).length
	if (
		range.from < 0 ||
		range.to <= range.from ||
		range.to > textLength ||
		!Number.isInteger(range.from) ||
		!Number.isInteger(range.to)
	) {
		throw new RangeError(
			`Invalid text range [${range.from}, ${range.to}) for text of length ${textLength}`
		)
	}

	return {
		type: 'text-range',
		shapeId,
		source: {
			richText: structuredClone(richText),
			from: range.from,
			to: range.to,
		},
	}
}

/**
 * Resolve an immutable text-range anchor against a shape's current rich text.
 *
 * Resolution is a pure operation: it never updates the anchor, the thread, or the shape. Because
 * every resolution starts from the original source snapshot, clients cannot double-map an anchor
 * when shape and comment records arrive in different orders, and undo can recover a range after a
 * temporary edit collapsed it.
 *
 * This prototype deliberately keeps the PR's single-span plaintext mapper so the storage and
 * consistency model can be evaluated independently from the diff algorithm. A production resolver
 * should use a structural, multi-span rich-text mapping.
 *
 * @public
 */
export function resolveTextRangeAnchor(
	anchor: TextRangeAnchor,
	currentRichText: TLRichText
): ResolvedTextRange {
	const oldText = getShapePlaintext(anchor.source.richText)
	const newText = getShapePlaintext(currentRichText)
	const sourceRange = { from: anchor.source.from, to: anchor.source.to }
	if (oldText === newText) return { ...sourceRange, status: 'attached' }

	const readings = [
		diffText(oldText, newText, 'earliest'),
		diffText(oldText, newText, 'latest'),
	].filter((edit): edit is TextEdit => edit !== null)

	const ranges = readings.map((edit) => ({
		from: mapOffset(sourceRange.from, edit, 'start'),
		to: mapOffset(sourceRange.to, edit, 'end'),
	}))
	const from = Math.max(...ranges.map((range) => range.from))
	const to = Math.min(...ranges.map((range) => range.to))

	if (from >= to) {
		// A single-span diff can treat multiple accumulated edits as one whole-document replacement.
		// Before collapsing, recover an untouched source quote when it has one exact current position.
		const sourceQuote = oldText.slice(sourceRange.from, sourceRange.to)
		const quoteAt = newText.indexOf(sourceQuote)
		if (quoteAt !== -1 && newText.indexOf(sourceQuote, quoteAt + 1) === -1) {
			return { from: quoteAt, to: quoteAt + sourceQuote.length, status: 'attached' }
		}

		const at = Math.min(from, to)
		return { from: at, to: at, status: 'collapsed' }
	}

	const ambiguous = ranges.some((range) => range.from !== from || range.to !== to)
	return { from, to, status: ambiguous ? 'ambiguous' : 'attached' }
}

/** The plaintext model currently shared by selection creation and DOM range measurement. */
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

interface TextEdit {
	start: number
	oldEnd: number
	newEnd: number
}

function diffText(
	oldText: string,
	newText: string,
	attribute: 'earliest' | 'latest'
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

	if (attribute === 'latest') {
		const start = matchPrefix(Math.min(oldText.length, newText.length))
		const suffix = matchSuffix(Math.min(oldText.length - start, newText.length - start))
		return { start, oldEnd: oldText.length - suffix, newEnd: newText.length - suffix }
	}

	const suffix = matchSuffix(Math.min(oldText.length, newText.length))
	const start = matchPrefix(Math.min(oldText.length - suffix, newText.length - suffix))
	return { start, oldEnd: oldText.length - suffix, newEnd: newText.length - suffix }
}

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
