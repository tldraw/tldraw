import { CommentText, CommentTextProps } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<CommentTextProps> = {
	title: 'Comments/Text',
	component: CommentText,
}
export default sketchbook

export const Default: Sketch<CommentTextProps> = {
	args: { text: 'Should this button be primary?' },
}
