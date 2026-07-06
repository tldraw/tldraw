import { Sketch, Sketchbook } from '../../sketch'
import { Reactions } from './reactions'

const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Comments/Reactions',
	component: Reactions,
}
export default sketchbook

export const Default: Sketch<Record<string, never>> = { args: {} }
