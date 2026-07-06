import { Sketch, Sketchbook } from '../../sketch'
import { CommentCard, CommentCardProps } from './comment-card'

const sketchbook: Sketchbook<CommentCardProps> = {
	title: 'Comments/Card',
	component: CommentCard,
}
export default sketchbook

export const FromThem: Sketch<CommentCardProps> = {
	args: { author: 'Ada Lovelace', body: 'Should this button be primary?', time: '2h', you: false },
}

export const FromYou: Sketch<CommentCardProps> = {
	args: { author: 'You', body: 'Good call — updating it now.', time: '1h', you: true },
}
