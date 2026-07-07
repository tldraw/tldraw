import { Reactions } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Comments/Reactions',
	component: Reactions,
}
export default sketchbook

export const Default: Sketch<Record<string, never>> = { args: {} }
