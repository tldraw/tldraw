import { Editor, TLShapeId } from '@tldraw/editor'
import { rerouteArrows } from './rerouteArrows'
import { resolveShapeOverlaps } from './resolveShapeOverlaps'
import { resolveTextWordWrap } from './resolveTextWordWrap'

/** @public */
export interface CleanupCanvasOptions {
	/** The shape IDs to process. Defaults to direct children of the current page. */
	shapeIds?: TLShapeId[]
	/** Minimum gap (in page units) between shapes. Default is 20. */
	padding?: number
	/** Maximum number of overlap-separation iterations. Default is 50. */
	maxIterations?: number
	/** Minimum clearance (in page units) between arrow paths and obstacles. Default is 4. */
	arrowClearance?: number
	/** Bend candidates to evaluate during arrow rerouting. See {@link rerouteArrows}. */
	arrowBendCandidates?: number[]
}

/**
 * Runs {@link resolveTextWordWrap}, {@link resolveShapeOverlaps}, and {@link rerouteArrows} as a
 * single undoable operation.
 *
 * @public
 */
export function cleanupCanvas(editor: Editor, opts: CleanupCanvasOptions = {}) {
	editor.run(() => {
		resolveTextWordWrap(editor, { shapeIds: opts.shapeIds })
		resolveShapeOverlaps(editor, {
			shapeIds: opts.shapeIds,
			padding: opts.padding,
			maxIterations: opts.maxIterations,
		})
		rerouteArrows(editor, {
			shapeIds: opts.shapeIds,
			clearance: opts.arrowClearance,
			bendCandidates: opts.arrowBendCandidates,
		})
	})
}
