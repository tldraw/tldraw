import { Sketch, Sketchbook } from '../../sketch'
import { CommentCard } from './comment-card'
import { CommentComposer } from './comment-composer'

interface CommentThreadProps {
	resolved: boolean
}

const NOW = Date.now()
const HOUR = 3_600_000
const ago = (ms: number) => new Date(NOW - ms).toISOString()

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
				date={ago(2 * HOUR)}
				you={false}
			/>
			<CommentCard author="You" body="Good call — updating it now." date={ago(HOUR)} you={true} />
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
