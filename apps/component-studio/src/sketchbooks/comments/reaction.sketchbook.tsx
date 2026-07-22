import { Reaction, ReactionProps } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<ReactionProps> = {
	title: 'Comments/Reaction',
	component: Reaction,
}
export default sketchbook

export const Reacted: Sketch<ReactionProps> = {
	args: {
		emoji: '👍',
		count: 3,
		active: true,
		reactors: [
			{ name: 'You', you: true },
			{ name: 'Bo', you: false },
			{ name: 'Ada', you: false },
		],
	},
}
export const NotReacted: Sketch<ReactionProps> = {
	args: {
		emoji: '👀',
		count: 2,
		active: false,
		reactors: [
			{ name: 'Bo', you: false },
			{ name: 'Cy', you: false },
		],
	},
}
