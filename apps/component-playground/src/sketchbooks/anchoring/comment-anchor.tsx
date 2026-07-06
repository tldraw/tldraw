import { CommentThread, sampleComments, sampleThread, TLCommentAnchor } from '../../comment-model'
import { AnchoredComment } from '../comments/anchored-comment'
import './comment-anchor.css'

export interface CommentAnchorProps {
	anchor: TLCommentAnchor
}

/**
 * A comment thread attached via each TLCommentAnchor kind: the anchor's spatial marker
 * plus the model-driven thread (pin + messages) anchored at it. The thread is the sample
 * thread with its anchor swapped, so the same conversation is shown attached five ways.
 */
export function CommentAnchor({ anchor }: CommentAnchorProps) {
	const thread: CommentThread = { ...sampleThread, anchor }
	return (
		<div className="anchor-canvas">
			{renderViz(anchor)}
			<div className="anchor-pin" style={pinPosition(anchor)}>
				<AnchoredComment thread={thread} comments={sampleComments} open />
			</div>
		</div>
	)
}

/** The spatial marker for an anchor kind — the shape/region/text it attaches to. */
function renderViz(anchor: TLCommentAnchor) {
	switch (anchor.type) {
		case 'shape':
			return <div className="anchor-shape" />
		case 'region':
			return <div className="anchor-region" />
		case 'text-range':
			return (
				<p className="anchor-text">
					The quick brown <mark className="anchor-mark">fox jumps over</mark> the lazy dog.
				</p>
			)
		case 'page':
		case 'point':
			return null
	}
}

/** Where the thread's pin sits — kept to the left so the popover has room to the right. */
function pinPosition(anchor: TLCommentAnchor): { top: string; left: string } {
	switch (anchor.type) {
		case 'shape':
			return { top: '30%', left: '26%' }
		case 'region':
			return { top: '24%', left: '26%' }
		case 'text-range':
			return { top: '42%', left: '20%' }
		case 'point':
			return { top: '28%', left: '22%' }
		case 'page':
			return { top: '18px', left: '18px' }
	}
}
