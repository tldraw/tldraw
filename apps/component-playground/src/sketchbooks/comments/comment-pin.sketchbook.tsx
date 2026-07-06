import { Sketch, Sketchbook } from '../../sketch'
import { CommentPin, CommentPinProps } from './comment-pin'

const sketchbook: Sketchbook<CommentPinProps> = {
	title: 'Comments/Pin',
	component: CommentPin,
}
export default sketchbook

export const Closed: Sketch<CommentPinProps> = { args: { number: 3, resolved: false } }
export const Hovered: Sketch<CommentPinProps> = {
	args: { number: 3, resolved: false },
	parameters: { pseudo: 'hover' },
}
export const Open: Sketch<CommentPinProps> = { args: { number: 3, resolved: false, open: true } }
export const Resolved: Sketch<CommentPinProps> = { args: { number: 3, resolved: true } }
