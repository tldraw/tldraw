import { Sketch, Sketchbook } from '../../sketch'
import { CommentCard } from './comment-card'
import { CommentComposer } from './comment-composer'

interface CommentThreadProps {
	resolved: boolean
}

// Composes the comment components into a thread — the kind of real composition the
// playground exists to develop.
function CommentThread({ resolved }: CommentThreadProps) {
	return (
		<div className="cmt-thread">
			<div className="cmt-thread__head">
				<span>Thread</span>
				{resolved && <span className="cmt-badge">Resolved</span>}
			</div>
			<CommentCard
				author="Ada Lovelace"
				body="Should this button be primary?"
				time="2h"
				you={false}
			/>
			<CommentCard author="You" body="Good call — updating it now." time="1h" you={true} />
			<CommentComposer author="You" placeholder="Reply…" />
		</div>
	)
}

const sketchbook: Sketchbook<CommentThreadProps> = {
	title: 'Comments/Thread',
	component: CommentThread,
}
export default sketchbook

export const Open: Sketch<CommentThreadProps> = { args: { resolved: false } }
export const Resolved: Sketch<CommentThreadProps> = { args: { resolved: true } }
