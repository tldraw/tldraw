import { Avatar, AvatarProps } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<AvatarProps> = {
	title: 'Comments/Avatar',
	component: Avatar,
}
export default sketchbook

export const Person: Sketch<AvatarProps> = { args: { author: { name: 'Ada Lovelace' } } }
export const You: Sketch<AvatarProps> = { args: { author: { name: 'You' } } }
export const Colored: Sketch<AvatarProps> = {
	args: { author: { name: 'Ada Lovelace', color: '#0E9F6E' } },
}
