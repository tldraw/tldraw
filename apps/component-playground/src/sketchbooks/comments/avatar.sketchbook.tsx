import { Sketch, Sketchbook } from '../../sketch'
import { Avatar, AvatarProps } from './avatar'

const sketchbook: Sketchbook<AvatarProps> = {
	title: 'Comments/Avatar',
	component: Avatar,
}
export default sketchbook

export const Person: Sketch<AvatarProps> = { args: { name: 'Ada Lovelace' } }
export const You: Sketch<AvatarProps> = { args: { name: 'You' } }
