import { CommentThread, sampleComments, sampleThread, TLCommentAnchor } from '../../comment-model'
import { AnchorScene } from './anchor-scene'

export interface CommentAnchorProps {
	anchor: TLCommentAnchor
	/** Whether the thread is open (pin + messages) or closed (just the pin). */
	open: boolean
}

/**
 * A comment thread attached via each TLCommentAnchor kind, shown against a real tldraw
 * editor. The thread is the sample thread with its anchor swapped, so the same conversation
 * is shown attached five ways: shape, point, region, page, text-range.
 */
export function CommentAnchor({ anchor, open }: CommentAnchorProps) {
	const thread: CommentThread = { ...sampleThread, anchor }
	return <AnchorScene anchor={anchor} thread={thread} comments={sampleComments} open={open} />
}
