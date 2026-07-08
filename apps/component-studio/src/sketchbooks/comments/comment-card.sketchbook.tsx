import { CommentCard, CommentText } from '@tldraw/comments'
import { Sketch, Sketchbook } from '../../sketch'

const NOW = Date.now()
const HOUR = 3_600_000
const ago = (ms: number) => new Date(NOW - ms).toISOString()

// CommentCard.body is a ReactNode, so these use `render` rather than args — a rendered body
// can't be a serializable control value.
const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Comments/Card',
}
export default sketchbook

export const FromThem: Sketch<Record<string, never>> = {
	render: () => (
		<CommentCard
			author="Ada Lovelace"
			body={<CommentText text="Should this button be primary?" />}
			date={ago(2 * HOUR)}
			you={false}
		/>
	),
}

export const FromYou: Sketch<Record<string, never>> = {
	render: () => (
		<CommentCard
			author="You"
			body={<CommentText text="Good call — updating it now." />}
			date={ago(HOUR)}
			you={true}
		/>
	),
}
