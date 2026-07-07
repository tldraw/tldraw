import { CommentComposer, CommentComposerProps } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<CommentComposerProps> = {
	title: 'Comments/Composer',
	component: CommentComposer,
}
export default sketchbook

export const Default: Sketch<CommentComposerProps> = {
	args: { author: 'You', placeholder: 'Add a comment…' },
}
