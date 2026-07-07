import { CommentPin, CommentPinProps } from '@tldraw/commenting'
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
