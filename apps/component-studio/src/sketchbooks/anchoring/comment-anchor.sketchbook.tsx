import { createShapeId, toRichText } from 'tldraw'
import { Sketch, Sketchbook } from '../../sketch'
import { CommentAnchor, CommentAnchorProps } from './comment-anchor'

const textRangeAnchor = {
	type: 'text-range' as const,
	shapeId: createShapeId('note'),
	source: {
		richText: toRichText('The quick brown fox jumps over the lazy dog.'),
		from: 16,
		to: 30,
	},
}

// One sketch per TLCommentAnchor kind, so each way a comment can attach is showcased.
const sketchbook: Sketchbook<CommentAnchorProps> = {
	title: 'Anchoring/Comment anchor',
	component: CommentAnchor,
	argTypes: {
		anchor: {
			control: 'union',
			discriminant: 'type',
			variants: {
				shape: { type: 'shape', shapeId: createShapeId('box'), x: 1, y: 0, isPrecise: false },
				point: { type: 'point', x: 120, y: 90 },
				region: { type: 'region', x: 60, y: 60, w: 180, h: 120 },
				page: { type: 'page' },
				'text-range': textRangeAnchor,
			},
		},
	},
}
export default sketchbook

// Shape anchors have two modes, like arrow bindings: imprecise sits at a default badge spot
// (top-right out of the box), precise sits exactly where it was placed. Both track the shape as it
// moves and resizes, since x/y are normalized.
export const ShapeImprecise: Sketch<CommentAnchorProps> = {
	args: {
		anchor: { type: 'shape', shapeId: createShapeId('box'), x: 1, y: 0, isPrecise: false },
		open: true,
	},
}
export const ShapePrecise: Sketch<CommentAnchorProps> = {
	args: {
		anchor: { type: 'shape', shapeId: createShapeId('box'), x: 0.5, y: 0.62, isPrecise: true },
		open: true,
	},
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
	args: {
		anchor: textRangeAnchor,
		open: true,
	},
}
