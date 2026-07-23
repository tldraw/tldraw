import { Sketch, Sketchbook } from '../../sketch'
import { CommentFlow } from './comment-flow'

const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Flows/Comment flow',
	component: CommentFlow,
}
export default sketchbook

/** The live, interactive commenting flow at desktop size. */
export const Desktop: Sketch<Record<string, never>> = {
	parameters: { viewport: 'desktop' },
}
