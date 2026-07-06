import { Tldraw } from 'tldraw'
import { CommentPin } from '../comments/comment-pin'
import { CommentsSidebar } from '../comments/comments-sidebar'
import './canvas-with-comments.css'

/**
 * An editing context with comments: the real tldraw editor with comment pins overlaid
 * and the comments sidebar. Responsive via container queries — the sidebar docks on
 * wide viewports and collapses on narrow ones.
 */
export function CanvasWithComments() {
	return (
		<div className="scene">
			<div className="scene__main">
				<div className="scene__canvas">
					<Tldraw />
					<div className="scene__pins">
						<div className="scene__pin" style={{ top: '24%', left: '30%' }}>
							<CommentPin number={1} resolved={false} />
						</div>
						<div className="scene__pin" style={{ top: '58%', left: '60%' }}>
							<CommentPin number={2} resolved={false} />
						</div>
					</div>
				</div>
				<div className="scene__sidebar">
					<CommentsSidebar empty={false} />
				</div>
			</div>
		</div>
	)
}
