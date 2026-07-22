import { Reactions, ReactionsProps } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<ReactionsProps> = {
	title: 'Comments/Reactions',
	component: Reactions,
}
export default sketchbook

const others = (...names: string[]) => names.map((name) => ({ name, you: false }))

export const Default: Sketch<ReactionsProps> = {
	args: {
		reactions: [
			{
				emoji: '👍',
				count: 3,
				active: true,
				reactors: [{ name: 'You', you: true }, ...others('Bo', 'Ada')],
			},
			{ emoji: '🎉', count: 1, active: false, reactors: others('Ada') },
			{ emoji: '👀', count: 2, active: false, reactors: others('Bo', 'Cy') },
		],
	},
}

// hovering the 👀 pill scrolls: seven reactors, list caps at five rows
export const ManyReactors: Sketch<ReactionsProps> = {
	args: {
		reactions: [
			{
				emoji: '👀',
				count: 7,
				active: false,
				reactors: others('Ada', 'Bo', 'Cy', 'Deb', 'Eli', 'Fran', 'Gus'),
			},
		],
	},
}

// with showSelf off, a reaction only you made shows no hover list
export const HideSelf: Sketch<ReactionsProps> = {
	args: {
		showSelf: false,
		reactions: [
			{ emoji: '👍', count: 1, active: true, reactors: [{ name: 'You', you: true }] },
			{
				emoji: '🎉',
				count: 2,
				active: true,
				reactors: [{ name: 'You', you: true }, ...others('Bo')],
			},
		],
	},
}

// signed out — counts still read, but there's nothing to press
export const ReadOnly: Sketch<ReactionsProps> = {
	args: {
		reactions: [
			{ emoji: '👍', count: 3, active: false, reactors: others('Ada', 'Bo', 'Cy') },
			{ emoji: '🎉', count: 1, active: false, reactors: others('Ada') },
		],
		canReact: false,
	},
}
