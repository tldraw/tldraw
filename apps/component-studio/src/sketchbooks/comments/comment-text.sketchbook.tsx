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

/** What formatting survives: bold, links, inline code, and lists. */
export const RichText: Sketch<CommentTextProps> = {
	args: {
		text: 'Make it **primary** — see [the spec](https://tldraw.dev). Swap the `variant` prop, then:\n\n- update the tokens\n- ship it',
	},
}
