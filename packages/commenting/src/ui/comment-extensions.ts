import {
	getTipTapDefaultExtensions,
	TaskItem,
	TaskItemToggleExtension,
	TaskList,
	TLRichText,
	toRichText,
} from 'tldraw'

// A posted comment is static HTML with nothing to write a click back to, so a checkbox there would
// toggle on screen and snap back.
const TASK_EXTENSION_NAMES = new Set([TaskList.name, TaskItem.name, TaskItemToggleExtension.name])

/**
 * tldraw's default rich-text extension set, minus headings and task lists — the deliberately
 * limited set used for both the comment composer and comment display. Comments support paragraphs,
 * bold, italic, lists, links, code, and highlight. Built from tldraw's shared factory so the config
 * stays in lockstep with the text shape's defaults rather than drifting from a copy.
 */
export const commentTipTapExtensions = getTipTapDefaultExtensions({ heading: false }).filter(
	(extension) => !TASK_EXTENSION_NAMES.has(extension.name)
)

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
