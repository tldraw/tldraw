import { TLCommentAnchor } from '../../comment-model'
import { CommentPin } from '../comments/comment-pin'
import './comment-anchor.css'

export interface CommentAnchorProps {
	anchor: TLCommentAnchor
}

/** Visualises where a comment thread attaches for each TLCommentAnchor kind. */
export function CommentAnchor({ anchor }: CommentAnchorProps) {
	return <div className="anchor-canvas">{renderAnchor(anchor)}</div>
}

function pin(top: string, left: string) {
	return (
		<div className="anchor-pin" style={{ top, left }}>
			<CommentPin number={1} resolved={false} />
		</div>
	)
}

function renderAnchor(anchor: TLCommentAnchor) {
	switch (anchor.type) {
		case 'shape':
			// pinned to a shape — the pin rides the shape's corner and follows it
			return (
				<>
					<div className="anchor-shape" />
					{pin('20%', '56%')}
				</>
			)
		case 'point':
			// a fixed point in page space
			return pin('40%', '44%')
		case 'region':
			// a rectangular area of the page
			return (
				<>
					<div className="anchor-region" />
					{pin('16%', '14%')}
				</>
			)
		case 'page':
			// a page-level thread with no spatial anchor
			return (
				<div className="anchor-page">
					<CommentPin number={1} resolved={false} />
					<span className="anchor-page__label">Page comment</span>
				</div>
			)
		case 'text-range':
			// a character range inside a shape's text
			return (
				<>
					<p className="anchor-text">
						The quick brown <mark className="anchor-mark">fox jumps over</mark> the lazy dog.
					</p>
					{pin('24%', '50%')}
				</>
			)
	}
}
