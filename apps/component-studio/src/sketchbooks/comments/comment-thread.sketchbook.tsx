import { CommentText, CommentThread } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const NOW = Date.now()
const HOUR = 3_600_000
const ago = (ms: number) => new Date(NOW - ms).toISOString()

const comments = [
	{
		author: 'Ada Lovelace',
		body: <CommentText text="Should this button be **primary**?" />,
		date: ago(2 * HOUR),
		you: false,
	},
	{
		author: 'You',
		body: <CommentText text="Good call — updating it now." />,
		date: ago(HOUR),
		you: true,
	},
]

// Rendered bodies inside `comments` aren't serializable, so these use `render`, not args.
const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Comments/Thread',
}
export default sketchbook

export const Open: Sketch<Record<string, never>> = {
	render: () => (
		<CommentThread
			comments={comments}
			header="Thread"
			composer={{ author: 'You', placeholder: 'Reply…' }}
		/>
	),
}

export const Resolved: Sketch<Record<string, never>> = {
	render: () => (
		<CommentThread comments={comments} header="Thread" resolvedBanner="Resolved by You" />
	),
}
