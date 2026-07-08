import { CommentPin, CommentPinProps } from '@tldraw/comments'
import { Sketch, Sketchbook } from '../../sketch'

const sketchbook: Sketchbook<CommentPinProps> = {
	title: 'Comments/Pin',
	component: CommentPin,
}
export default sketchbook

export const Closed: Sketch<CommentPinProps> = { render: () => <CommentPin>3</CommentPin> }
export const Hovered: Sketch<CommentPinProps> = {
	render: () => <CommentPin>3</CommentPin>,
	parameters: { pseudo: 'hover' },
}
export const Open: Sketch<CommentPinProps> = { render: () => <CommentPin open>3</CommentPin> }
export const Resolved: Sketch<CommentPinProps> = {
	render: () => <CommentPin resolved>3</CommentPin>,
}

// The pin's content is a lever: a comment count vs the thread author's initial. dotcom shows the
// initial; the count is the alternative — captured side by side so the choice is explicit.
export const Count: Sketch<CommentPinProps> = { render: () => <CommentPin>3</CommentPin> }
export const AuthorInitial: Sketch<CommentPinProps> = { render: () => <CommentPin>J</CommentPin> }
