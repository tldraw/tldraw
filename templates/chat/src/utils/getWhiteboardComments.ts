import { getLiveComments, getLiveCommentThreads, richTextToPlaintext } from '@tldraw/commenting'
import { Box, Editor, TLCommentAnchor } from 'tldraw'

export function getWhiteboardComments(editor: Editor, padding: number): string {
	const bounds = editor.getCurrentPageBounds()?.clone().expandBy(padding)
	if (!bounds) return ''

	const comments = getLiveComments(editor).sort((a, b) => a.createdAt - b.createdAt)
	return getLiveCommentThreads(editor)
		.filter((thread) => thread.pageId === editor.getCurrentPageId())
		.sort((a, b) => a.createdAt - b.createdAt)
		.map((thread, index) => {
			const bodies = comments
				.filter((comment) => comment.threadId === thread.id)
				.map((comment) => richTextToPlaintext(comment.body).trim())
				.filter(Boolean)
			if (!bodies.length) return ''
			const location = describeAnchor(editor, thread.anchor, bounds)
			return [
				`Comment ${index + 1}${location ? ` (${location})` : ''}${thread.resolved ? ' [resolved]' : ''}:`,
				...bodies.map((body, reply) => (reply ? `Reply: ${body}` : body)),
			].join('\n')
		})
		.filter(Boolean)
		.join('\n\n')
}

function describeAnchor(editor: Editor, anchor: TLCommentAnchor, bounds: Box): string {
	const position = (point: { x: number; y: number }) =>
		`${Math.round(((point.x - bounds.x) / bounds.w) * 100)}% from left, ${Math.round(((point.y - bounds.y) / bounds.h) * 100)}% from top`

	switch (anchor.type) {
		case 'page':
			return 'whole image'
		case 'point':
			return position(anchor)
		case 'region':
			return `region from ${position(anchor)} to ${position({ x: anchor.x + anchor.w, y: anchor.y + anchor.h })}`
		case 'shape': {
			const shape = editor.getShape(anchor.shapeId)
			if (!shape) return ''
			const geometry = editor.getShapeGeometry(shape).bounds
			const point = editor.getShapePageTransform(shape).applyToPoint({
				x: geometry.x + geometry.w * (anchor.isPrecise ? anchor.x : 0.5),
				y: geometry.y + geometry.h * (anchor.isPrecise ? anchor.y : 0.5),
			})
			return `${anchor.isPrecise ? 'point' : 'shape centered'} at ${position(point)}`
		}
	}
}
