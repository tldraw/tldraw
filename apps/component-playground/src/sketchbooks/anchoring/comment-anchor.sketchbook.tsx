import { Sketch, Sketchbook } from '../../sketch'
import { CommentAnchor, CommentAnchorProps } from './comment-anchor'

// One sketch per TLCommentAnchor kind, so each way a comment can attach is showcased.
const sketchbook: Sketchbook<CommentAnchorProps> = {
	title: 'Anchoring/Comment anchor',
	component: CommentAnchor,
	argTypes: {
		anchor: {
			control: 'union',
			discriminant: 'type',
			variants: {
				shape: { type: 'shape', shapeId: 'shape:box' },
				point: { type: 'point', x: 120, y: 90 },
				region: { type: 'region', x: 60, y: 60, w: 180, h: 120 },
				page: { type: 'page' },
				'text-range': { type: 'text-range', shapeId: 'shape:note', from: 16, to: 30 },
			},
		},
	},
}
export default sketchbook

export const Shape: Sketch<CommentAnchorProps> = {
	args: { anchor: { type: 'shape', shapeId: 'shape:box' }, open: true },
}
export const Point: Sketch<CommentAnchorProps> = {
	args: { anchor: { type: 'point', x: 110, y: 110 }, open: true },
}
export const Region: Sketch<CommentAnchorProps> = {
	args: { anchor: { type: 'region', x: 30, y: 70, w: 120, h: 96 }, open: true },
}
export const Page: Sketch<CommentAnchorProps> = {
	args: { anchor: { type: 'page' }, open: true },
}
export const TextRange: Sketch<CommentAnchorProps> = {
	args: { anchor: { type: 'text-range', shapeId: 'shape:note', from: 16, to: 30 }, open: true },
}
