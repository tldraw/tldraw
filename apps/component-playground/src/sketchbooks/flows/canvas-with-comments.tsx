import { CommentPin } from '../comments/comment-pin'
import { CommentsSidebar } from '../comments/comments-sidebar'
import './canvas-with-comments.css'

/**
 * An editing context with comments: a canvas with comment pins and a comment tool,
 * plus the comments sidebar. Responsive via container queries — the sidebar docks on
 * wide viewports and collapses (behind the topbar count) on narrow ones.
 */
export function CanvasWithComments() {
	return (
		<div className="scene">
			<div className="scene__topbar">
				<span className="scene__title">Untitled</span>
				<span className="scene__badge">2 comments</span>
			</div>
			<div className="scene__main">
				<div className="scene__canvas">
					<div className="scene__pin" style={{ top: '24%', left: '30%' }}>
						<CommentPin number={1} resolved={false} />
					</div>
					<div className="scene__pin" style={{ top: '58%', left: '60%' }}>
						<CommentPin number={2} resolved={false} />
					</div>
					<div className="scene__toolbar">
						<button className="scene__tool" type="button" aria-label="Select">
							⌖
						</button>
						<button className="scene__tool scene__tool--active" type="button" aria-label="Comment">
							💬
						</button>
						<button className="scene__tool" type="button" aria-label="Draw">
							✎
						</button>
					</div>
				</div>
				<div className="scene__sidebar">
					<CommentsSidebar empty={false} />
				</div>
			</div>
		</div>
	)
}
