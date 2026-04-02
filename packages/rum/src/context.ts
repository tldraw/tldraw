import type { Editor } from '@tldraw/editor'
import type { RumContext } from './types'

/** Bucket a raw shape count into a coarse category for aggregation. @public */
export function bucketShapeCount(count: number): RumContext['shapeCountBucket'] {
	if (count <= 50) return '0-50'
	if (count <= 200) return '50-200'
	if (count <= 500) return '200-500'
	return '500+'
}

/** Capture the current segmentation context from the editor. @public */
export function captureContext(editor: Editor): RumContext {
	const shapeCount = editor.getCurrentPageShapeIds().size
	return {
		shapeCount,
		shapeCountBucket: bucketShapeCount(shapeCount),
		selectionSize: editor.getSelectedShapeIds().length,
		userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
		viewport: {
			width: typeof window !== 'undefined' ? window.innerWidth : 0,
			height: typeof window !== 'undefined' ? window.innerHeight : 0,
		},
	}
}
