import { CommentThread, sampleComments, sampleThread, TLCommentAnchor } from '../../comment-model'
import { AnchoredComment } from '../comments/anchored-comment'
import { TextRangeAnchor } from './text-range-anchor'
import './comment-anchor.css'

export interface CommentAnchorProps {
	anchor: TLCommentAnchor
	/** Whether the thread is open (pin + messages) or closed (just the pin). */
	open: boolean
}

/**
 * A comment thread attached via each TLCommentAnchor kind: the anchor's spatial marker
 * plus the model-driven thread (pin + messages) anchored at it. The thread is the sample
 * thread with its anchor swapped, so the same conversation is shown attached five ways.
 * Text-range uses a real tldraw text shape and measures the highlight from its text.
 */
export function CommentAnchor({ anchor, open }: CommentAnchorProps) {
	const thread: CommentThread = { ...sampleThread, anchor }
	if (anchor.type === 'text-range') {
		return (
			<TextRangeAnchor
				thread={thread}
				comments={sampleComments}
				open={open}
				from={anchor.from}
				to={anchor.to}
			/>
		)
	}
	return (
		<div className="anchor-canvas">
			{renderViz(anchor)}
			<div className="anchor-pin" style={pinPosition(anchor)}>
				<AnchoredComment thread={thread} comments={sampleComments} open={open} />
			</div>
		</div>
	)
}

/** The spatial marker for an anchor kind — the shape/region it attaches to. */
function renderViz(anchor: TLCommentAnchor) {
	switch (anchor.type) {
		case 'shape':
			return <div className="anchor-shape" />
		case 'region':
			return <div className="anchor-region" />
		case 'page':
		case 'point':
		case 'text-range':
			return null
	}
}

/**
 * Where the thread's pin sits: adjacent to the anchor's target (a shape's corner, a
 * region's corner), kept within the top-left quadrant so the popover (~324×200) always
 * has room to the right and below, and never overflows.
 */
function pinPosition(anchor: TLCommentAnchor): { top: string; left: string } {
	switch (anchor.type) {
		case 'shape':
			return { top: '20%', left: '25%' }
		case 'region':
			return { top: '18%', left: '28%' }
		case 'point':
			return { top: '22%', left: '22%' }
		case 'page':
			return { top: '16px', left: '16px' }
		case 'text-range':
			return { top: '15%', left: '26%' }
	}
}
