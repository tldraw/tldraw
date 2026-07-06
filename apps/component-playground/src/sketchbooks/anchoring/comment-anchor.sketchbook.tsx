import { Sketch, Sketchbook } from '../../sketch'
import { CommentAnchor, CommentAnchorProps } from './comment-anchor'

// One sketch per TLCommentAnchor kind, so each way a comment can attach is showcased.
const sketchbook: Sketchbook<CommentAnchorProps> = {
	title: 'Anchoring/Comment anchor',
	component: CommentAnchor,
}
export default sketchbook

export const Shape: Sketch<CommentAnchorProps> = {
	args: { anchor: { type: 'shape', shapeId: 'shape:box' } },
}
export const Point: Sketch<CommentAnchorProps> = {
	args: { anchor: { type: 'point', x: 120, y: 90 } },
}
export const Region: Sketch<CommentAnchorProps> = {
	args: { anchor: { type: 'region', x: 60, y: 60, w: 180, h: 120 } },
}
export const Page: Sketch<CommentAnchorProps> = {
	args: { anchor: { type: 'page' } },
}
export const TextRange: Sketch<CommentAnchorProps> = {
	args: { anchor: { type: 'text-range', shapeId: 'shape:note', from: 16, to: 30 } },
}
