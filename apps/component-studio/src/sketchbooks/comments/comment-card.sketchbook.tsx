import { Sketch, Sketchbook } from '../../sketch'
import { CommentCard, CommentCardProps } from './comment-card'

const NOW = Date.now()
const HOUR = 3_600_000
const ago = (ms: number) => new Date(NOW - ms).toISOString()

const sketchbook: Sketchbook<CommentCardProps> = {
	title: 'Comments/Card',
	component: CommentCard,
	argTypes: { date: { control: 'date' } },
}
export default sketchbook

export const FromThem: Sketch<CommentCardProps> = {
	args: {
		author: 'Ada Lovelace',
		body: 'Should this button be primary?',
		date: ago(2 * HOUR),
		you: false,
	},
}

export const FromYou: Sketch<CommentCardProps> = {
	args: { author: 'You', body: 'Good call — updating it now.', date: ago(HOUR), you: true },
}
