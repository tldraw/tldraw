import { Reactions, ReactionsProps } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<ReactionsProps> = {
	title: 'Comments/Reactions',
	component: Reactions,
}
export default sketchbook

export const Default: Sketch<ReactionsProps> = {
	args: {
		reactions: [
			{ emoji: '👍', count: 3, active: true },
			{ emoji: '🎉', count: 1, active: false },
			{ emoji: '👀', count: 2, active: false },
		],
	},
}

// signed out — counts still read, but there's nothing to press
export const ReadOnly: Sketch<ReactionsProps> = {
	args: {
		reactions: [
			{ emoji: '👍', count: 3, active: false },
			{ emoji: '🎉', count: 1, active: false },
		],
		canReact: false,
	},
}
