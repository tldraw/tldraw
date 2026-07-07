import { CommentCard } from './comment-card'
import { CommentComposer } from './comment-composer'
import './comments.css'
import { EmptyState } from './empty-state'

const NOW = Date.now()
const HOUR = 3_600_000
const ago = (ms: number) => new Date(NOW - ms).toISOString()

export interface CommentsSidebarProps {
	empty: boolean
}

/** The full comments panel: header, a list of comments (or empty state), and a composer. */
export function CommentsSidebar({ empty }: CommentsSidebarProps) {
	return (
		<div className="cmt-sidebar">
			<div className="cmt-sidebar__header">
				<span className="cmt-sidebar__title">Comments</span>
				<span className="cmt-sidebar__count">{empty ? 0 : 2}</span>
			</div>
			<div className="cmt-sidebar__body">
				{empty ? (
					<EmptyState message="No comments yet. Start the conversation." />
				) : (
					<>
						<CommentCard
							author="Ada Lovelace"
							body="Should this button be primary?"
							date={ago(2 * HOUR)}
							you={false}
						/>
						<CommentCard
							author="You"
							body="Good call — updating it now."
							date={ago(HOUR)}
							you={true}
						/>
					</>
				)}
			</div>
			<div className="cmt-sidebar__footer">
				<CommentComposer author="You" placeholder="Add a comment…" />
			</div>
		</div>
	)
}
