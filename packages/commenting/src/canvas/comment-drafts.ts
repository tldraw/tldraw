import { deleteFromLocalStorage, getFromLocalStorage, setInLocalStorage } from '@tldraw/utils'
import type { TLRichText } from 'tldraw'
import { isCommentEmpty } from '../ui/comment-extensions'

const DRAFT_KEY_PREFIX = 'tldraw-comment-draft'

/** The single slot for an unsent new-comment (placement composer) draft. The anchor is re-picked
 *  by clicking when the composer reopens, so only the text is worth keeping — and without a
 *  universal document id in the SDK, one slot is the honest scope. */
export const NEW_COMMENT_DRAFT = 'new'

/** The draft slot for an unsent reply on a thread. Thread record ids are globally unique and
 *  stable across reloads, so replies never need a document key. @public */
export function replyDraftSlot(threadId: string): string {
	return `reply:${threadId}`
}

/** Read a saved unsent draft, or undefined when there is none (or it fails to parse). @public */
export function getCommentDraft(slot: string): TLRichText | undefined {
	const raw = getFromLocalStorage(`${DRAFT_KEY_PREFIX}:${slot}`)
	if (!raw) return undefined
	try {
		return JSON.parse(raw) as TLRichText
	} catch {
		return undefined
	}
}

/**
 * Save an unsent draft so click-away and reload don't lose it — the flip side of not warning
 * before discard. Saving empty content clears the slot instead, so deleting your text and
 * closing doesn't resurrect an empty draft later.
 * @public
 */
export function saveCommentDraft(slot: string, value: TLRichText) {
	if (isCommentEmpty(value)) {
		clearCommentDraft(slot)
		return
	}
	setInLocalStorage(`${DRAFT_KEY_PREFIX}:${slot}`, JSON.stringify(value))
}

/** Remove a saved draft (after posting, or when its content was emptied). @public */
export function clearCommentDraft(slot: string) {
	deleteFromLocalStorage(`${DRAFT_KEY_PREFIX}:${slot}`)
}
