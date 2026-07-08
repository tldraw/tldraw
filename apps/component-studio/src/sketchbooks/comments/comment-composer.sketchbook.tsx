import { CommentComposer, CommentComposerProps } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<CommentComposerProps> = {
	title: 'Comments/Composer',
	component: CommentComposer,
}
export default sketchbook

/** Placing a new thread: the composer that opens at the click point. */
export const Placement: Sketch<CommentComposerProps> = {
	args: { author: 'You', placeholder: 'Add a comment…' },
}

/** Replying inside an open thread. */
export const Reply: Sketch<CommentComposerProps> = {
	args: { author: 'You', placeholder: 'Reply…' },
}
