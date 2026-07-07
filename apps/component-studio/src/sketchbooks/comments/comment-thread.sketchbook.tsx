import { CommentText, CommentThread, CommentThreadProps } from '@tldraw/commenting'
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

const sketchbook: Sketchbook<CommentThreadProps> = {
	title: 'Comments/Thread',
	component: CommentThread,
}
export default sketchbook

export const Open: Sketch<CommentThreadProps> = {
	args: {
		comments,
		header: 'Thread',
		composer: { author: 'You', placeholder: 'Reply…' },
	},
}

export const Resolved: Sketch<CommentThreadProps> = {
	args: {
		comments,
		header: 'Thread',
		resolvedBy: 'You',
	},
}
