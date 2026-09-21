import { useTranslation } from 'tldraw'

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
	const key = replyCount === 1 ? 'comments.replies-one' : 'comments.replies'
	return msg(key).replace('{count}', String(replyCount))
}
