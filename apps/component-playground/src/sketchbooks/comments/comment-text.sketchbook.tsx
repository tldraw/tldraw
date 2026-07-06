import { Sketch, Sketchbook } from '../../sketch'
import { CommentText, CommentTextProps } from './comment-text'

const sketchbook: Sketchbook<CommentTextProps> = {
	title: 'Comments/Text',
	component: CommentText,
}
export default sketchbook

export const Default: Sketch<CommentTextProps> = {
	args: { text: 'Should this button be primary?' },
}
