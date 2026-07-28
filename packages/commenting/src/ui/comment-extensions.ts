import { Slice } from '@tiptap/pm/model'
import { getTipTapDefaultExtensions, TLRichText, toRichText } from 'tldraw'

/**
 * tldraw's default rich-text extension set, minus headings — the deliberately limited set used for
 * both the comment composer and comment display. Comments support paragraphs, bold, italic, lists,
 * links, code, and highlight, but not headings. Built from tldraw's shared factory so the config
 * stays in lockstep with the text shape's defaults rather than drifting from a copy.
 */
export const commentTipTapExtensions = getTipTapDefaultExtensions({ heading: false })

/** An empty comment document — the seed value for a fresh composer and its post-submit reset. */
export const EMPTY_COMMENT: TLRichText = toRichText('')

/**
 * Whether a rich-text comment body has no text. Mirrors tldraw's private `isEmptyRichText`: an
 * empty doc can be encoded as an empty `content` array or a single empty paragraph.
 */
export function isCommentEmpty(richText: TLRichText): boolean {
	if (richText.content.length === 0) return true
	if (richText.content.length === 1) {
		const node = richText.content[0] as any
		if (!node.content || node.content.length === 0) return true
	}
	return false
}

/**
 * Paste a whole-paragraph copy into the middle of a line without breaking the line in two.
 * Copying a comment selected with Select all (rather than with shift+arrows) puts the paragraph on
 * the clipboard as a closed block, and ProseMirror inserts a closed block as a paragraph of its
 * own — so pasting it back mid-sentence splits the line around it. A comment field is a
 * sentence-level input, so a single copied block pastes as its inline content instead. Slices with
 * several blocks, or with list structure, are left alone: there the block structure is the point.
 */
export function unwrapSingleBlockPaste(slice: Slice): Slice {
	if (slice.openStart !== 0 || slice.openEnd !== 0 || slice.content.childCount !== 1) return slice
	const only = slice.content.firstChild
	if (!only?.isTextblock) return slice
	return new Slice(only.content, 0, 0)
}
