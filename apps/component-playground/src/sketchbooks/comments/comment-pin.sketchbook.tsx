import { Sketch, Sketchbook } from '../../sketch'
import { CommentPin, CommentPinProps } from './comment-pin'

const sketchbook: Sketchbook<CommentPinProps> = {
	title: 'Comments/Pin',
	component: CommentPin,
}
export default sketchbook

export const Open: Sketch<CommentPinProps> = { args: { number: 3, resolved: false } }
export const Resolved: Sketch<CommentPinProps> = { args: { number: 3, resolved: true } }
