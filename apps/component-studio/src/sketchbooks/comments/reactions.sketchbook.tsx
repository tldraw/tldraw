import { Reactions } from '@tldraw/comments'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Comments/Reactions',
	component: Reactions,
}
export default sketchbook

export const Default: Sketch<Record<string, never>> = { args: {} }
