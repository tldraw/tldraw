import { Reaction, ReactionProps } from '@tldraw/comments'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<ReactionProps> = {
	title: 'Comments/Reaction',
	component: Reaction,
}
export default sketchbook

export const Reacted: Sketch<ReactionProps> = { args: { emoji: '👍', count: 3, active: true } }
export const NotReacted: Sketch<ReactionProps> = { args: { emoji: '👀', count: 2, active: false } }
