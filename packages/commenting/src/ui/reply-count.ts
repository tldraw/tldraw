import { defineMessages, useTranslation } from 'tldraw'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	commentsReplies: {
		id: 'comments.replies',
		defaultMessage: '{count, plural, one {# reply} other {# replies}}',
	},
})

/**
 * The localized "N replies" label (e.g. "1 reply", "3 replies") for a thread with `replyCount`
 * replies — the comments after the opening one. Returns null when there are none, so callers render
 * nothing rather than "0 replies". Shared by the sidebar row and the hover preview so both read the
 * same, with each site owning where it puts the text.
 */
export function replyCountLabel(
	msg: ReturnType<typeof useTranslation>,
	replyCount: number
): string | null {
	if (replyCount <= 0) return null
	return msg(messages.commentsReplies.id, { count: replyCount })
}
