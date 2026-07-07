import { Sketch, Sketchbook } from '../../sketch'
import { CommentsFromModel } from './from-model'

const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Comments/From model',
	component: CommentsFromModel,
}
export default sketchbook

export const Default: Sketch<Record<string, never>> = { args: {} }
